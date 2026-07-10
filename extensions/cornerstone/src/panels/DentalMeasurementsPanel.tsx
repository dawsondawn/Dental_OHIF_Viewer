import React from 'react';
import { useSystem, utils } from '@ohif/core';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
  MeasurementTable,
} from '@ohif/ui-next';
import { CORNERSTONE_3D_TOOLS_SOURCE_NAME, CORNERSTONE_3D_TOOLS_SOURCE_VERSION } from '../enums';

import { useMeasurements } from '../hooks/useMeasurements';

const { downloadBlob } = utils;
const DENTAL_BACKEND_URL = 'http://127.0.0.1:4010';

type DentalMeasurementPreset = {
  id: string;
  title: string;
  toolName: string;
  label: string;
};

const dentalMeasurementPresets: DentalMeasurementPreset[] = [
  {
    id: 'pa-length',
    title: 'Periapical length (mm)',
    toolName: 'Length',
    label: 'PA length',
  },
  {
    id: 'canal-angle',
    title: 'Canal angle (°)',
    toolName: 'Angle',
    label: 'Canal angle',
  },
  {
    id: 'crown-width',
    title: 'Crown width (mm)',
    toolName: 'Length',
    label: 'Crown width',
  },
  {
    id: 'root-length',
    title: 'Root length (mm)',
    toolName: 'Length',
    label: 'Root length',
  },
];

const sortOptions = [
  { id: 'newest', label: 'Newest' },
  { id: 'label-asc', label: 'Label A-Z' },
  { id: 'label-desc', label: 'Label Z-A' },
  { id: 'value-asc', label: 'Value low-high' },
  { id: 'value-desc', label: 'Value high-low' },
] as const;

function extractNumericValue(measurement: any): number {
  const firstDetail = measurement?.displayText?.primary?.[0];
  if (!firstDetail) {
    return Number.NaN;
  }

  const match = `${firstDetail}`.match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : Number.NaN;
}

function compareMeasurements(a: any, b: any, sortBy: string) {
  switch (sortBy) {
    case 'label-asc':
      return `${a.label ?? ''}`.localeCompare(`${b.label ?? ''}`);
    case 'label-desc':
      return `${b.label ?? ''}`.localeCompare(`${a.label ?? ''}`);
    case 'value-asc': {
      const aValue = extractNumericValue(a);
      const bValue = extractNumericValue(b);
      if (Number.isNaN(aValue) && Number.isNaN(bValue)) return 0;
      if (Number.isNaN(aValue)) return 1;
      if (Number.isNaN(bValue)) return -1;
      return aValue - bValue;
    }
    case 'value-desc': {
      const aValue = extractNumericValue(a);
      const bValue = extractNumericValue(b);
      if (Number.isNaN(aValue) && Number.isNaN(bValue)) return 0;
      if (Number.isNaN(aValue)) return 1;
      if (Number.isNaN(bValue)) return -1;
      return bValue - aValue;
    }
    case 'newest':
    default:
      return 0;
  }
}

export default function DentalMeasurementsPanel() {
  const { servicesManager, commandsManager } = useSystem();
  const measurementService = servicesManager.services.measurementService!;

  const measurements = useMeasurements() as Array<any>;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<(typeof sortOptions)[number]['id']>('newest');
  const [activePreset, setActivePreset] = React.useState<DentalMeasurementPreset | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<string>('');
  const hasMountedRef = React.useRef(false);
  const lastSavedSnapshotRef = React.useRef('');
  const isHydratingRef = React.useRef(false);
  const hasHydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (!activePreset) {
      return;
    }

    const { unsubscribe } = measurementService.subscribe(
      measurementService.EVENTS.MEASUREMENT_ADDED,
      (data: any) => {
        const { measurement } = data ?? {};
        if (!measurement || measurement.toolName !== activePreset.toolName) {
          return;
        }

        if (
          measurement.label &&
          measurement.label !== measurement.toolName &&
          measurement.label !== activePreset.label
        ) {
          return;
        }

        commandsManager.runCommand('updateMeasurement', {
          uid: measurement.uid,
          textLabel: activePreset.label,
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activePreset, commandsManager, measurementService]);

  const visibleMeasurements = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredMeasurements = measurements.filter(measurement => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        measurement.label,
        measurement.toolName,
        measurement.displayText?.primary?.join(' '),
        measurement.displayText?.secondary?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    if (sortBy === 'newest') {
      return [...filteredMeasurements].reverse();
    }

    return [...filteredMeasurements].sort((a, b) => compareMeasurements(a, b, sortBy));
  }, [measurements, searchTerm, sortBy]);

  const activatePreset = (preset: DentalMeasurementPreset) => {
    setActivePreset(preset);

    commandsManager.runCommand('setToolActiveToolbar', {
      toolName: preset.toolName,
      toolGroupIds: ['default', 'mpr'],
    });
  };

  const exportMeasurementsAsJson = React.useCallback(() => {
    if (!measurements.length) {
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      measurementCount: measurements.length,
      measurements,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });

    downloadBlob(blob, {
      filename: `dental_measurements_${new Date().toISOString().slice(0, 10)}.json`,
    });
  }, [measurements]);

  React.useEffect(() => {
    if (hasHydratedRef.current || measurements.length > 0) {
      return;
    }

    let isCancelled = false;

    const hydrateFromBackend = async () => {
      try {
        const response = await fetch(`${DENTAL_BACKEND_URL}/api/dental-measurements/latest`);
        if (!response.ok) {
          hasHydratedRef.current = true;
          return;
        }

        const payload = await response.json();
        const savedMeasurements = payload?.record?.measurements;

        if (!Array.isArray(savedMeasurements) || savedMeasurements.length === 0) {
          hasHydratedRef.current = true;
          return;
        }

        let source = null;
        let sourceMappings: Array<any> = [];
        for (let attempt = 0; attempt < 10; attempt += 1) {
          if (isCancelled) {
            return;
          }

          source = measurementService.getSource(
            CORNERSTONE_3D_TOOLS_SOURCE_NAME,
            CORNERSTONE_3D_TOOLS_SOURCE_VERSION
          );

          const mappings = measurementService.getSourceMappings(
            CORNERSTONE_3D_TOOLS_SOURCE_NAME,
            CORNERSTONE_3D_TOOLS_SOURCE_VERSION
          );

          sourceMappings = Array.isArray(mappings) ? mappings : [];

          if (source && Array.isArray(mappings) && mappings.length > 0) {
            break;
          }

          await new Promise(resolve => window.setTimeout(resolve, 250));
        }

        if (!source || !sourceMappings.length) {
          setSaveStatus('Saved measurements found, but measurement source is not ready yet');
          return;
        }

        isHydratingRef.current = true;
        let restoredCount = 0;

        savedMeasurements.forEach(savedMeasurement => {
          const annotationType = savedMeasurement?.toolName;
          const mapping = sourceMappings.find(
            candidate => candidate.annotationType === annotationType
          );

          if (!annotationType || !savedMeasurement?.data || !mapping?.toMeasurementSchema) {
            return;
          }

          const referencedImageId =
            savedMeasurement?.metadata?.referencedImageId || savedMeasurement?.referencedImageId;
          const annotationMetadata = {
            ...(savedMeasurement.metadata || {}),
            toolName: annotationType,
            FrameOfReferenceUID: savedMeasurement.FrameOfReferenceUID,
            referencedImageId,
          };

          const handles = {
            points: Array.isArray(savedMeasurement.points) ? savedMeasurement.points : [],
            textBox: savedMeasurement.textBox,
          };

          const annotationBody = {
            label: savedMeasurement.label,
            text: savedMeasurement.label,
            handles,
            cachedStats: savedMeasurement.data,
            frameNumber: savedMeasurement.frameNumber || 1,
          };

          const annotationData = {
            annotation: {
              annotationUID: savedMeasurement.uid,
              metadata: annotationMetadata,
              predecessorImageId: savedMeasurement.predecessorImageId,
              data: annotationBody,
            },
            uid: savedMeasurement.uid,
          };

          const addedUID = measurementService.addRawMeasurement(
            source,
            annotationType,
            annotationData,
            mapping.toMeasurementSchema,
            {
              getImageIdsForInstance: () => (referencedImageId ? [referencedImageId] : []),
            }
          );

          if (addedUID) {
            restoredCount += 1;
          }
        });

        lastSavedSnapshotRef.current = JSON.stringify(savedMeasurements);

        if (restoredCount > 0) {
          setSaveStatus(`Restored ${restoredCount} measurement${restoredCount === 1 ? '' : 's'}`);
        } else {
          setSaveStatus('Saved measurements were found but could not be restored');
        }
      } catch {
        // If backend is unavailable, panel keeps working with local session measurements.
      } finally {
        isHydratingRef.current = false;
        hasHydratedRef.current = true;
      }
    };

    hydrateFromBackend();

    return () => {
      isCancelled = true;
    };
  }, [measurementService, measurements.length]);

  React.useEffect(() => {
    const snapshot = JSON.stringify(measurements);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (isHydratingRef.current) {
      return;
    }

    if (!measurements.length || snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      if (isCancelled) {
        return;
      }

      setIsSaving(true);
      setSaveStatus('');

      try {
        const response = await fetch(`${DENTAL_BACKEND_URL}/api/dental-measurements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: 'dental-panel',
            measurements,
          }),
        });

        if (!response.ok) {
          throw new Error(`Auto-save failed with status ${response.status}`);
        }

        lastSavedSnapshotRef.current = snapshot;
        setSaveStatus(
          `Auto-saved ${measurements.length} measurement${measurements.length === 1 ? '' : 's'}`
        );
      } catch (error) {
        setSaveStatus(error instanceof Error ? error.message : 'Unable to auto-save measurements');
      } finally {
        if (!isCancelled) {
          setIsSaving(false);
        }
      }
    }, 700);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [measurements]);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="default"
              className="gap-2"
            >
              <Icons.Add className="h-4 w-4" />
              New measurement
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {dentalMeasurementPresets.map(preset => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => activatePreset(preset)}
              >
                <span>{preset.title}</span>
                <span className="text-muted-foreground ml-2 text-xs">{preset.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {activePreset ? (
          <div className="text-muted-foreground text-sm">
            Active: <span className="text-foreground font-medium">{activePreset.label}</span>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">Choose a measurement preset</div>
        )}
      </div>

      {/* <div className="flex items-center"> */}
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={exportMeasurementsAsJson}
        disabled={measurements.length === 0}
      >
        <Icons.Download className="h-4 w-4" />
        Export JSON
      </Button>

      {/* {isSaving ? <div className="text-muted-foreground text-xs">Auto-saving...</div> : null} */}
      {/* {!isSaving && saveStatus ? <div className="text-muted-foreground text-xs">{saveStatus}</div> : null} */}
      {/* </div> */}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Filter</span>
          <input
            type="search"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search label, tool, or value"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground h-9 rounded-md border px-3 text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Sort</span>
          <select
            value={sortBy}
            onChange={event => setSortBy(event.target.value as (typeof sortOptions)[number]['id'])}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm outline-none"
          >
            {sortOptions.map(option => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MeasurementTable
        title="Measurements"
        data={visibleMeasurements}
        isExpanded={true}
        onAction={(event, command, uid) =>
          Array.isArray(command)
            ? command.forEach(singleCommand =>
                commandsManager.runCommand(singleCommand, {
                  uid,
                  annotationUID: uid,
                  displayMeasurements: visibleMeasurements,
                  event,
                })
              )
            : commandsManager.runCommand(command, {
                uid,
                annotationUID: uid,
                displayMeasurements: visibleMeasurements,
                event,
              })
        }
      >
        <MeasurementTable.Body />
      </MeasurementTable>
    </div>
  );
}

import React from 'react';
import {
  Button,
  Icons,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ohif/ui-next';
import HeaderPatientInfo, { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';

const FDI_TEETH = [
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '51',
  '52',
  '53',
  '54',
  '55',
  '61',
  '62',
  '63',
  '64',
  '65',
  '71',
  '72',
  '73',
  '74',
  '75',
  '81',
  '82',
  '83',
  '84',
  '85',
];

const UNIVERSAL_TEETH = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
];

type DentalModeHeaderProps = {
  appConfig: AppTypes.Config;
  servicesManager: AppTypes.ServicesManager;
  isReturnEnabled: boolean;
  onClickReturnButton: () => void;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick: () => void;
  }>;
};

function DentalModeHeader({
  appConfig,
  servicesManager,
  isReturnEnabled,
  onClickReturnButton,
  menuOptions,
}: DentalModeHeaderProps) {
  const [toothNumbering, setToothNumbering] = React.useState<'FDI' | 'Universal'>('FDI');
  const [selectedTooth, setSelectedTooth] = React.useState(FDI_TEETH[0]);

  const toothOptions = toothNumbering === 'FDI' ? FDI_TEETH : UNIVERSAL_TEETH;
  const practiceName =
    (appConfig as AppTypes.Config & { dentalPracticeName?: string })?.dentalPracticeName ||
    'OHIF Dental Practice';

  React.useEffect(() => {
    setSelectedTooth(toothOptions[0]);
  }, [toothNumbering]);

  return (
    <div className="bg-popover border-background relative z-20 px-2">
      <div className="flex h-[48px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isReturnEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted"
              data-cy="return-to-work-list"
              onClick={onClickReturnButton}
            >
              <Icons.ArrowLeft className="text-primary h-5 w-5" />
            </Button>
          )}
          <Icons.DentalTheme className="text-primary h-5 w-5" />
          <span className="text-foreground max-w-[220px] truncate text-sm font-semibold">
            {practiceName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
            <HeaderPatientInfo
              servicesManager={servicesManager}
              appConfig={appConfig}
            />
          )}

          <div className="bg-muted border-border flex items-center gap-2 rounded-md border px-2 py-1">
            <span className="text-muted-foreground text-xs font-medium">Tooth Selector</span>
            <Select
              value={toothNumbering}
              onValueChange={value => setToothNumbering(value as 'FDI' | 'Universal')}
            >
              <SelectTrigger
                className="h-7 w-[105px]"
                aria-label="Tooth numbering scheme"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FDI">FDI</SelectItem>
                <SelectItem value="Universal">Universal</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedTooth}
              onValueChange={setSelectedTooth}
            >
              <SelectTrigger
                className="h-7 w-[90px]"
                aria-label="Selected tooth"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toothOptions.map(tooth => (
                  <SelectItem
                    key={tooth}
                    value={tooth}
                  >
                    {tooth}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:bg-muted"
              >
                <Icons.GearSettings />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuOptions.map((option, index) => {
                const IconComponent = option.icon ? Icons[option.icon as keyof typeof Icons] : null;

                return (
                  <DropdownMenuItem
                    key={index}
                    onSelect={option.onClick}
                    className="flex items-center gap-2 py-2"
                  >
                    {IconComponent && (
                      <span className="flex h-4 w-4 items-center justify-center">
                        <Icons.ByName name={option.icon as string} />
                      </span>
                    )}
                    <span className="flex-1">{option.title}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default DentalModeHeader;

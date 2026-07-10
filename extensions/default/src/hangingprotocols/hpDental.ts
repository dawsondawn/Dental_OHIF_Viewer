import { Types } from '@ohif/core';

const currentDisplaySetSelector = {
  studyMatchingRules: [
    {
      attribute: 'studyInstanceUIDsIndex',
      from: 'options',
      required: true,
      constraint: {
        equals: { value: 0 },
      },
    },
  ],
  seriesMatchingRules: [
    {
      attribute: 'numImageFrames',
      constraint: {
        greaterThan: { value: 0 },
      },
    },
    {
      attribute: 'isDisplaySetFromUrl',
      weight: 20,
      constraint: {
        equals: true,
      },
    },
  ],
};

const priorDisplaySetSelector = {
  studyMatchingRules: [
    {
      attribute: 'studyInstanceUIDsIndex',
      from: 'options',
      required: true,
      constraint: {
        equals: { value: 1 },
      },
    },
  ],
  seriesMatchingRules: [
    {
      attribute: 'numImageFrames',
      constraint: {
        greaterThan: { value: 0 },
      },
    },
    {
      attribute: 'isDisplaySetFromUrl',
      weight: 20,
      constraint: {
        equals: true,
      },
    },
  ],
};

// Deliberately impossible match to produce placeholder viewports for bitewing slots.
const bitewingPlaceholderSelector = {
  studyMatchingRules: [
    {
      attribute: 'StudyInstanceUID',
      constraint: {
        equals: { value: '__BITEWING_PLACEHOLDER__' },
      },
    },
  ],
  seriesMatchingRules: [],
};

const currentViewport = {
  viewportOptions: {
    toolGroupId: 'default',
    allowUnmatchedView: true,
  },
  displaySets: [{ id: 'currentDisplaySetId' }],
};

const priorViewport = {
  viewportOptions: {
    toolGroupId: 'default',
    allowUnmatchedView: true,
  },
  displaySets: [{ id: 'priorDisplaySetId' }],
};

const bitewingPlaceholderViewport = {
  viewportOptions: {
    toolGroupId: 'default',
    allowUnmatchedView: true,
  },
  displaySets: [{ id: 'bitewingPlaceholderDisplaySetId' }],
};

const hpDental: Types.HangingProtocol.Protocol = {
  id: '@ohif/hpDental',
  description: 'Dental mode 2x2 with current, prior, and bitewing placeholders',
  name: 'Dental 2x2',
  numberOfPriorsReferenced: 1,
  protocolMatchingRules: [],
  toolGroupIds: ['default'],
  displaySetSelectors: {
    currentDisplaySetId: currentDisplaySetSelector,
    priorDisplaySetId: priorDisplaySetSelector,
    bitewingPlaceholderDisplaySetId: bitewingPlaceholderSelector,
  },
  defaultViewport: {
    viewportOptions: {
      viewportType: 'stack',
      toolGroupId: 'default',
      allowUnmatchedView: true,
    },
    displaySets: [{ id: 'currentDisplaySetId' }],
  },
  stages: [
    {
      id: 'dental-2x2',
      name: 'Dental 2x2',
      stageActivation: {
        enabled: {
          minViewportsMatched: 1,
        },
      },
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
        },
      },
      // Top-left: current image, top-right: prior exam.
      // Bottom row: bitewing placeholders.
      viewports: [
        currentViewport,
        priorViewport,
        bitewingPlaceholderViewport,
        bitewingPlaceholderViewport,
      ],
    },
  ],
};

export default hpDental;

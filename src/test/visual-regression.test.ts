import initStoryshots from '@storybook/addon-storyshots';
import { imageSnapshot } from '@storybook/addon-storyshots-puppeteer';
import path from 'path';

// Configure image snapshot settings
const getMatchOptions = () => ({
  failureThreshold: 0.02, // Allow for small differences (2%)
  failureThresholdType: 'percent',
});

const beforeScreenshot = (page: any) => {
  // Wait for any animations to complete
  return page.waitForTimeout(300);
};

const getCustomSnapshotIdentifier = ({ story, context }: any) => {
  const kind = context.kind.toLowerCase().replace(/\s+/g, '-');
  const name = story.name.toLowerCase().replace(/\s+/g, '-');
  return `${kind}--${name}`;
};

// Initialize Storyshots with Puppeteer configuration
initStoryshots({
  suite: 'Visual Regression Tests',
  test: imageSnapshot({
    storybookUrl: 'http://localhost:6006', // Default Storybook port
    customSnapshotIdentifier: getCustomSnapshotIdentifier,
    beforeScreenshot,
    getMatchOptions,
    // Store snapshots in a dedicated directory
    customSnapshotsDir: path.join(__dirname, '../__image_snapshots__'),
  }),
}); 
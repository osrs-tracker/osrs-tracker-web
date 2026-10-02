import {
  BarController,
  BarElement,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeSeriesScale,
  Tooltip,
} from 'chart.js';
import Annotation from 'chartjs-plugin-annotation';

/**
 * Shared Chart.js registrations, imported for its side effects by every chart component.
 *
 * Registration happens once at import time, so it's guaranteed to happen before any chart is created:
 * the annotation plugin needs to be registered globally (it registers its annotation element types on register),
 * and only initializes its state for charts that are created after it was registered.
 */
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeSeriesScale,
  Tooltip,
  Annotation,
);

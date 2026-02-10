import { describe, it, expect } from 'bun:test';
import { generateChartStyles } from './chart-utils';

describe('generateChartStyles', () => {
  it('should generate styles for valid config', () => {
    const id = 'test-id';
    const config = {
      series1: { color: 'red' },
      series2: { theme: { light: 'blue', dark: 'navy' } },
    };
    const styles = generateChartStyles(id, config);
    expect(styles).toContain(`[data-chart='${id}']`);
    expect(styles).toContain('--color-series1: red;');
    expect(styles).toContain('--color-series2: blue;');
    expect(styles).toContain(`.dark [data-chart='${id}']`);
    expect(styles).toContain('--color-series2: navy;');
  });

  it('should sanitize XSS via id', () => {
    const id = 'test-id] { } </style><script>alert(1)</script>';
    const config = {
      series1: { color: 'red' },
    };
    const styles = generateChartStyles(id, config);
    expect(styles).not.toContain('<script>');
    expect(styles).not.toContain('</style>');
    // Verify escaped content is present
    expect(styles).toContain('\\3c script\\3e');
  });

  it('should sanitize CSS injection via key', () => {
    const id = 'test-id';
    const key = 'series1: red; } body { background: pink; } .foo {';
    const config = {
      [key]: { color: 'red' },
    };
    const styles = generateChartStyles(id, config);
    expect(styles).not.toContain(' } body {');
    expect(styles).toContain('body \\7b');
  });

  it('should sanitize CSS injection via color', () => {
    const id = 'test-id';
    const color = "red; background: url('javascript:alert(1)')";
    const config = {
      series1: { color: color },
    };
    const styles = generateChartStyles(id, config);
    // The semicolon should be escaped
    expect(styles).not.toContain('; background:');
    expect(styles).toContain('\\3b  background:');
  });

  it('should handle quotes in values correctly', () => {
    const id = 'test-id';
    const config = {
      series1: { color: '"Arial"' },
    };
    const styles = generateChartStyles(id, config);
    // " is escaped to \22
    expect(styles).toContain('\\22 Arial\\22 ');
  });

  it('should escape backslash and slash', () => {
    const id = 'test\\id/foo';
    const config = {
      series1: { color: 'red' },
    };
    const styles = generateChartStyles(id, config);
    expect(styles).toContain('test\\5c id\\2f foo');
  });
});

/**
 * AiBrand Extension v3 — Smart Content Injector
 *
 * Injects publish content into platform pages using a two-tier approach:
 *
 * Tier 1: Precise CSS selector (fast, reliable)
 * Tier 2: AI-assisted hint matching (fallback when selectors fail)
 *
 * This module is responsible for:
 * - Detecting page readiness (DOM fully loaded + SPA routing complete)
 * - Finding target elements by selector or AI hint
 * - Executing pipeline steps (input text, click buttons, select options, upload files)
 * - Handling dynamic UIs (lazy-loaded components, popups, overlays)
 */

import type { PipelineStep } from '@/shared/types';
import {
  INJECT_DELAY_AFTER_LOAD,
  INJECT_STEP_DELAY,
  INJECT_ELEMENT_TIMEOUT,
} from '@/shared/constants';
import { sleep } from '@/shared/utils';

// ─── Types ────────────────────────────────────────────────────────────────

interface ElementCandidate {
  selector: string;
  tagName: string;
  text: string;
  placeholder: string;
  type: string;
}

interface InjectResult {
  stepId: string;
  success: boolean;
  error?: string;
}

// ─── Smart Injector ───────────────────────────────────────────────────────

export class SmartInjector {
  private defaultStepDelay = INJECT_STEP_DELAY;
  private elementTimeout = INJECT_ELEMENT_TIMEOUT;

  /**
   * Inject content by executing a pipeline of steps.
   * Each step targets an element on the page and performs an action.
   */
  async inject(
    tabId: number,
    pipeline: PipelineStep[],
    context: Record<string, string>,
  ): Promise<InjectResult[]> {
    const results: InjectResult[] = [];

    // Wait for page to be fully ready
    await sleep(INJECT_DELAY_AFTER_LOAD);
    await this.waitForPageReady(tabId);

    for (const step of pipeline) {
      const result = await this.executeStep(tabId, step, context);
      results.push(result);

      if (!result.success && !step.optional) {
        console.error(`[Injector] Critical step failed: ${step.id}`);
        break; // Stop pipeline on critical failure
      }
    }

    return results;
  }

  /**
   * Execute a single pipeline step.
   */
  async executeStep(
    tabId: number,
    step: PipelineStep,
    context: Record<string, string>,
  ): Promise<InjectResult> {
    try {
      // Resolve template value
      const resolvedValue = this.resolveValue(step.value, context);

      // Try precise selector first
      let element = step.target.selector
        ? await this.findElement(tabId, step.target.selector)
        : null;

      // Fallback to AI hint matching
      if (!element && step.target.aiHint) {
        console.log(`[Injector] Selector not found — trying aiHint: "${step.target.aiHint}"`);
        const candidates = await this.findByAiHint(tabId, step.target.aiHint);
        if (candidates.length > 0) {
          element = candidates[0]; // Use best match
          console.log(`[Injector] aiHint matched: ${element.tagName} → ${element.selector}`);
        }
      }

      // XPath fallback
      if (!element && step.target.xpath) {
        element = await this.findByXPath(tabId, step.target.xpath);
      }

      if (!element) {
        if (step.optional) {
          return { stepId: step.id, success: true, error: 'Element not found (optional — skipped)' };
        }
        return {
          stepId: step.id,
          success: false,
          error: `Element not found: selector="${step.target.selector}", aiHint="${step.target.aiHint}"`,
        };
      }

      // Execute the step action
      await this.executeAction(tabId, element.selector, step.type, resolvedValue);

      // Post-step delay
      if (step.waitAfter) {
        await sleep(step.waitAfter);
      } else {
        await sleep(this.defaultStepDelay);
      }

      return { stepId: step.id, success: true };
    } catch (err) {
      return {
        stepId: step.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── Element Finding ──────────────────────────────────────────────────

  private async findElement(
    tabId: number,
    selector: string,
  ): Promise<ElementCandidate | null> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'AIBRAND_DOM_QUERY',
        data: { selector },
      });

      if (response?.found) {
        return {
          selector,
          tagName: response.tagName ?? 'UNKNOWN',
          text: '',
          placeholder: '',
          type: '',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async findByAiHint(
    tabId: number,
    hint: string,
  ): Promise<ElementCandidate[]> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'AIBRAND_DOM_QUERY',
        data: { aiHint: hint },
      });

      return response?.candidates ?? [];
    } catch {
      return [];
    }
  }

  private async findByXPath(
    tabId: number,
    _xpath: string,
  ): Promise<ElementCandidate | null> {
    // XPath evaluation happens in content script via executeScript
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (xpath: string) => {
          const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          );
          const node = result.singleNodeValue as HTMLElement;
          if (!node) return null;
          return {
            selector: node.id ? `#${node.id}` : node.tagName.toLowerCase(),
            tagName: node.tagName,
            text: node.textContent?.slice(0, 50) ?? '',
            placeholder: (node as HTMLInputElement).placeholder ?? '',
            type: (node as HTMLInputElement).type ?? '',
          };
        },
        args: [_xpath],
      });

      return results[0]?.result ?? null;
    } catch {
      return null;
    }
  }

  // ─── Action Execution ─────────────────────────────────────────────────

  private async executeAction(
    tabId: number,
    selector: string,
    type: PipelineStep['type'],
    value: string,
  ): Promise<void> {
    switch (type) {
      case 'input':
        await this.executeInput(tabId, selector, value);
        break;

      case 'click':
        await this.executeClick(tabId, selector);
        break;

      case 'select':
        await this.executeSelect(tabId, selector, value);
        break;

      case 'upload':
        // File upload is handled by the Media Uploader
        await this.executeClick(tabId, selector); // Trigger file input
        break;

      case 'wait':
        await sleep(parseInt(value) || 1000);
        break;

      case 'custom':
        // Custom actions — execute as JavaScript
        await this.executeCustom(tabId, selector, value);
        break;

      default:
        // Forward to content script
        await this.forwardToContentScript(tabId, type, selector, value);
    }
  }

  private async executeInput(tabId: number, selector: string, value: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, val: string) => {
        const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
        if (!el) throw new Error(`Input not found: ${sel}`);

        // Focus first
        el.focus();

        // Clear existing content
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (el.getAttribute('contenteditable') === 'true') {
          el.textContent = '';
        }

        // Type the value (simulate human typing for anti-bot detection)
        if (val.length < 50) {
          // Short text: type character by character
          for (const char of val) {
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
              el.value += char;
            } else if (el.getAttribute('contenteditable') === 'true') {
              el.textContent += char;
            }
            el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else {
          // Long text: paste all at once
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.value = val;
          } else if (el.getAttribute('contenteditable') === 'true') {
            el.textContent = val;
          }
        }

        // Trigger change events
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      },
      args: [selector, value],
    });
  }

  private async executeClick(tabId: number, selector: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement;
        if (!el) throw new Error(`Element not found: ${sel}`);
        if (el instanceof HTMLButtonElement && el.disabled) {
          throw new Error(`Button is disabled: ${sel}`);
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.click();
      },
      args: [selector],
    });
  }

  private async executeSelect(tabId: number, selector: string, value: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, val: string) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        if (!el) throw new Error(`Select not found: ${sel}`);

        // Try matching by value first, then by text content
        const option = Array.from(el.options).find(
          (o) => o.value === val || o.textContent?.trim() === val,
        );

        if (option) {
          el.value = option.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new Error(`Option "${val}" not found in select: ${sel}`);
        }
      },
      args: [selector, value],
    });
  }

  private async executeCustom(tabId: number, selector: string, value: string): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, val: string) => {
        const el = document.querySelector(sel) as HTMLElement;
        if (!el) throw new Error(`Element not found: ${sel}`);

        // Execute the value as JavaScript in the page context
        // This allows complex interactions (e.g., trigger React/Vue events)
        try {
          const fn = new Function('element', 'value', val);
          fn(el, val);
        } catch (err) {
          throw new Error(`Custom action failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
      args: [selector, value],
    });
  }

  private async forwardToContentScript(
    tabId: number,
    type: string,
    selector: string,
    value: string,
  ): Promise<void> {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'AIBRAND_EXECUTE_STEP',
      data: { stepId: 'injector_step', type, selector, value },
    });

    if (!response?.success) {
      throw new Error(response?.error ?? `Step failed: ${type}`);
    }
  }

  // ─── Page Readiness ───────────────────────────────────────────────────

  private async waitForPageReady(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return new Promise<void>((resolve) => {
          // Check document ready state
          if (document.readyState === 'complete') {
            // Wait for any lazy content (SPA mounting)
            const observer = new MutationObserver(() => {
              // If we see a form or main content area appear, resolve
              if (
                document.querySelector('form') ||
                document.querySelector('[role="main"]') ||
                document.querySelector('.publish-container') ||
                document.querySelector('#app [class*="publish"]')
              ) {
                observer.disconnect();
                resolve();
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
            });

            // Timeout fallback: resolve after 5s even if no form found
            setTimeout(() => {
              observer.disconnect();
              resolve();
            }, 5000);
          } else {
            // Wait for load event
            window.addEventListener('load', () => resolve(), { once: true });
          }
        });
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private resolveValue(
    value: PipelineStep['value'],
    context: Record<string, string>,
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;

    if (typeof value === 'object' && 'template' in value) {
      let resolved = value.template;
      for (const [key, val] of Object.entries(context)) {
        resolved = resolved.replaceAll(`{{${key}}}`, val);
      }
      return resolved;
    }

    return '';
  }

  /**
   * Set custom delays for testing or tuning.
   */
  setDelays(stepDelay: number, elementTimeout: number): void {
    this.defaultStepDelay = stepDelay;
    this.elementTimeout = elementTimeout;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: SmartInjector | null = null;

export function getSmartInjector(): SmartInjector {
  if (!instance) {
    instance = new SmartInjector();
  }
  return instance;
}

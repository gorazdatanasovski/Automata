import { Page, Locator, FrameLocator } from 'playwright';
import { FieldMapping, FieldType, DICTIONARY } from './dictionary.js';
import { UserProfile } from '../types/profile.js';

export class DomScanner {
  private page: Page;
  private rootCache: Locator | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Root detection: handles Greenhouse iframe and plain pages ──
  private async getRoot(): Promise<Locator> {
    if (this.rootCache) return this.rootCache;

    const iframeEl = this.page
      .locator('iframe#grnhse_iframe, iframe[src*="greenhouse.io"], iframe[src*="lever.co"]')
      .first();

    if (await iframeEl.isVisible().catch(() => false)) {
      this.rootCache = iframeEl.contentFrame().locator('body');
    } else {
      this.rootCache = this.page.locator('body');
    }
    return this.rootCache;
  }

  // Strip punctuation Greenhouse loves to pad labels with
  private normalize(str: string): string {
    return str.toLowerCase().replace(/[\*\:\?\!\-\/\|]/g, '').trim();
  }

  // ── PUBLIC ENTRY POINT ──────────────────────────────────────────
  /**
   * Fill a single field identified by its logical name using the
   * profile value. Routes to the correct fill strategy based on
   * the FieldType declared in DICTIONARY.
   */
  public async fillField(logicalName: string, profile: any): Promise<void> {
    const mapping = DICTIONARY.find(d => d.logicalName === logicalName);
    if (!mapping) throw new Error(`[FATAL] Unknown field: ${logicalName}`);

    // search for the value in profile.personal, profile.address, profile.education, profile.legal, profile.application, profile.long_form, profile.files, profile.eeo
    let rawValue: string | undefined = undefined;
    for (const section of Object.values(profile)) {
      if (section && typeof section === 'object' && logicalName in section) {
        rawValue = (section as any)[logicalName];
        break;
      }
    }

    if (rawValue === undefined || rawValue === '') {
      console.warn(`[SKIP] No profile value for: ${logicalName}`);
      return;
    }

    switch (mapping.type) {
      case 'text':
        await this.fillText(mapping, rawValue);
        break;
      case 'textarea':
        await this.fillTextarea(mapping, rawValue);
        break;
      case 'select':
        await this.fillSelect(mapping, rawValue);
        break;
      case 'radio':
        await this.fillRadio(mapping, rawValue);
        break;
      case 'checkbox':
        await this.fillCheckbox(mapping, rawValue);
        break;
      case 'file':
        await this.fillFile(mapping, rawValue);
        break;
    }
  }

  /**
   * Convenience: fill every field in the profile that has a mapping.
   * Silently skips fields with no profile value.
   */
  public async fillAll(profile: any): Promise<void> {
    for (const mapping of DICTIONARY) {
      try {
        await this.fillField(mapping.logicalName, profile);
      } catch (err) {
        // Non-fatal: field might not appear on this specific form
        console.warn(`[SKIP] ${mapping.logicalName}: ${(err as Error).message}`);
      }
    }

    // After attempting all dictionary mappings, use LLM to catch any remaining unmapped mandatory fields
    await this.fillUnmappedFields(profile);
  }

  public async fillUnmappedFields(profile: any): Promise<void> {
    const root = await this.getRoot();
    
    // Find all visible textareas (usually custom behavioral questions)
    // We can also target inputs if needed, but textareas are safer for LLM generation
    const emptyFields = await root.locator('textarea:visible, input[type="text"]:visible').all();
    
    for (const field of emptyFields) {
      const val = await field.inputValue().catch(() => 'filled');
      if (!val || val.trim() === '') {
        const parent = field.locator('xpath=ancestor::div[1] | ancestor::fieldset[1]');
        const html = await parent.evaluate(n => n.outerHTML).catch(() => '');
        
        // Skip tiny generic inputs that might just be first name artifacts
        if (html && html.length > 50) {
          console.log(`\n[LLM FALLBACK] Discovered empty unmapped field. Querying local Ollama...`);
          try {
            const answer = await this.queryOllama(html, profile);
            if (answer && answer.trim() !== '') {
              await field.click();
              await field.fill(answer);
              console.log(`[LLM SUCCESS] Injected: "${answer.substring(0, 50)}..."`);
            }
          } catch (e: any) {
            console.warn(`[LLM WARN] Ollama fallback failed: ${e.message}`);
          }
        }
      }
    }
  }

  private async queryOllama(html: string, profile: any): Promise<string> {
    const prompt = `
    You are an automated job application assistant filling out a Chicago prop-trading firm application.
    You encountered a custom behavioral or technical question.
    
    Question HTML Context:
    ${html}

    Applicant Profile Context:
    ${JSON.stringify(profile.long_form)}

    Task: Synthesize a concise, 1-3 sentence technical answer to this question based on the applicant's profile.
    If the question asks for a link, output ONLY the raw URL (e.g., from profile.personal.linkedin or github).
    If it asks a yes/no question like "Are you subject to a non-compete?", answer strictly based on the profile.
    Do NOT output any introductory text, Markdown formatting, or quotes. Output ONLY the raw string to be typed into the box.
    `;

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const data = await response.json() as any;
    return data.response.trim();
  }

  // ── SCAN: find the locator for a field (read-only, no fill) ─────
  public async scanForField(logicalName: string): Promise<Locator> {
    const mapping = DICTIONARY.find(d => d.logicalName === logicalName);
    if (!mapping) throw new Error(`Unknown logical field: ${logicalName}`);
    return this.findLocator(mapping);
  }

  // ── FILL STRATEGIES ────────────────────────────────────────────

  private async fillText(mapping: FieldMapping, value: string): Promise<void> {
    const root = await this.getRoot();
    const locator = await this.findTextInput(root, mapping);

    const role = await locator.getAttribute('role').catch(() => null);
    if (role === 'combobox') {
      await this.fillReactSelect(locator, value);
      return;
    }

    await locator.click({ clickCount: 3 });  // select all before typing
    await locator.fill(value);
  }

  private async fillReactSelect(locator: any, value: string): Promise<void> {
    await locator.click();
    await locator.pressSequentially(value);
    
    // Wait for the React Select dropdown menu to render in the DOM
    await this.page.waitForSelector('[role="listbox"], .select2-results', { state: 'visible', timeout: 5000 }).catch(() => null);
    
    const dropdownList = this.page.locator('[role="listbox"], .select2-results').last();
    
    // Prioritize exact match to prevent 'Male' matching 'Female'
    let option = dropdownList.getByText(value, { exact: true }).first();
    if (!(await option.isVisible({ timeout: 1000 }).catch(() => false))) {
      option = dropdownList.getByText(value, { exact: false }).first();
    }
    
    if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
      await option.click();
    } else {
      // Fallback: Press Enter if the exact visible text isn't strictly found
      await locator.press('Enter');
    }
  }

  private async fillTextarea(mapping: FieldMapping, value: string): Promise<void> {
    const root = await this.getRoot();

    // Try textarea role first
    for (const kw of mapping.keywords) {
      const normalized = this.normalize(kw);
      const el = root.getByRole('textbox', { name: new RegExp(normalized, 'i') }).first();
      if (await el.isVisible().catch(() => false)) {
        const tag = await el.evaluate(n => n.tagName.toLowerCase());
        if (tag === 'textarea') {
          await el.click({ clickCount: 3 });
          await el.fill(value);
          return;
        }
      }
    }

    // Fall back to label proximity
    const locator = await this.findTextInput(root, mapping);
    await locator.click({ clickCount: 3 });
    await locator.fill(value);
  }

  private async fillSelect(mapping: FieldMapping, value: string): Promise<void> {
    const root = await this.getRoot();
    const locator = await this.findSelectInput(root, mapping);

    const candidates = mapping.valueMap?.[value] ?? [value];

    const role = await locator.getAttribute('role').catch(() => null);
    if (role === 'combobox') {
      await this.fillReactSelect(locator, candidates[0]);
      return;
    }

    // Native <select>
    const tag = await locator.evaluate(n => n.tagName.toLowerCase()).catch(() => '');
    if (tag === 'select') {
      for (const candidate of candidates) {
        try {
          await locator.selectOption({ label: candidate });
          return;
        } catch { /* try next */ }
      }
      // Fall back: partial match
      const options = await locator.locator('option').allTextContents();
      
      // Exact match (case insensitive)
      let match = options.find(o => candidates.some(c => o.trim().toLowerCase() === c.toLowerCase()));
      
      // Partial match
      if (!match) {
        match = options.find(o =>
          candidates.some(c => o.toLowerCase().includes(c.toLowerCase()))
        );
      }
      if (match) {
        await locator.selectOption({ label: match });
        return;
      }
    }

    // Custom dropdown (React/Radix/Tailwind styled div)
    // Universal Click Emulation as requested
    await locator.click();
    
    // Await DOM state change for popover/listbox to appear
    try {
      await this.page.waitForSelector('[role="listbox"], [role="menu"], [role="dialog"]', { timeout: 2000, state: 'visible' });
    } catch {
      // Fallback: wait a bit if no standard role appears
      await this.page.waitForTimeout(500);
    }

    const dropdownList = this.page.locator('[role="listbox"], [role="menu"], [role="dialog"], .select2-results').last();
    let foundOptionsText = '';
    try {
      const allOptsText = await dropdownList.innerText();
      foundOptionsText = `\nAvailable options: ${allOptsText}`;
    } catch(e) {}

    for (const candidate of candidates) {
      // Try exact match first to prevent substring overlap (e.g., Male matching Female)
      let option = dropdownList.getByText(candidate, { exact: true }).first();
      if (!(await option.isVisible().catch(() => false))) {
        option = dropdownList.getByText(candidate, { exact: false }).first();
      }
      
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        return;
      }
    }

    throw new Error(`[SELECT FAIL] Could not match value "${value}" for field "${mapping.logicalName}".${foundOptionsText}`);
  }

  private async fillRadio(mapping: FieldMapping, value: string): Promise<void> {
    const root = await this.getRoot();
    const candidates = mapping.valueMap?.[value] ?? [value];

    // Strategy 1: find by accessible label on the radio input itself
    for (const candidate of candidates) {
      const radio = root
        .getByRole('radio', { name: new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.check({ force: true });
        return;
      }
    }

    // Strategy 2: find the fieldset/group by the question keyword, then check
    // the correct option label within that group
    for (const kw of mapping.keywords) {
      const normalized = this.normalize(kw);
      const groups = root.getByText(normalized, { exact: false });
      const count = await groups.count();

      for (let i = 0; i < count; i++) {
        const node = groups.nth(i);

        // Walk to the containing fieldset or nearest div group
        const container = node.locator(
          'xpath=ancestor::fieldset[1] | ancestor::div[contains(@class,"field")][1] | ancestor::div[contains(@class,"question")][1]'
        ).first();

        if (await container.isVisible().catch(() => false)) {
          for (const candidate of candidates) {
            const radio = container
              .getByRole('radio', { name: new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
              .first();
            if (await radio.isVisible().catch(() => false)) {
              await radio.check({ force: true });
              return;
            }

            // Label text proximity within container
            const label = container
              .locator(`label, span`)
              .filter({ hasText: new RegExp(candidate, 'i') })
              .first();
            if (await label.isVisible().catch(() => false)) {
              // Click the label (checks associated radio)
              await label.click();
              return;
            }
          }
        }
      }
    }

    console.warn(
      `[RADIO WARN] Could not find radio for "${mapping.logicalName}" value "${value}" ` +
      `— candidates tried: ${candidates.join(', ')}`
    );
  }

  private async fillCheckbox(mapping: FieldMapping, value: string): Promise<void> {
    const root = await this.getRoot();
    const shouldCheck = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';

    for (const kw of mapping.keywords) {
      const normalized = this.normalize(kw);
      const checkbox = root
        .getByRole('checkbox', { name: new RegExp(normalized, 'i') })
        .first();
      if (await checkbox.isVisible().catch(() => false)) {
        const checked = await checkbox.isChecked();
        if (shouldCheck && !checked) await checkbox.check({ force: true });
        if (!shouldCheck && checked) await checkbox.uncheck({ force: true });
        return;
      }
    }
  }

  private async fillFile(mapping: FieldMapping, filePath: string): Promise<void> {
    const root = await this.getRoot();

    for (const kw of mapping.keywords) {
      const normalized = this.normalize(kw);

      // Direct file input near a label
      const fileInput = root
        .locator(`input[type="file"]`)
        .filter({ has: root.locator(`text=/${normalized}/i`) })
        .first();

      if (await fileInput.isVisible().catch(() => false)) {
        await fileInput.setInputFiles(filePath);
        return;
      }

      // Proximity approach: find the label text, then hunt for sibling/ancestor file input
      const label = root.getByText(normalized, { exact: false }).first();
      if (await label.isVisible().catch(() => false)) {
        const ancestor = label.locator('xpath=ancestor::div[2]').first();
        const input = ancestor.locator('input[type="file"]').first();
        if (await input.isVisible().catch(() => false) || await input.isHidden().catch(() => false)) {
          // File inputs are often hidden — setInputFiles works even on hidden
          await input.setInputFiles(filePath);
          return;
        }
      }

      // Last resort: any file input on the page (works when there's only one)
      const anyFileInput = root.locator('input[type="file"]').first();
      if (await anyFileInput.count() > 0) {
        await anyFileInput.setInputFiles(filePath);
        return;
      }
    }

    throw new Error(`[FILE FAIL] Could not locate file upload for "${mapping.logicalName}"`);
  }

  // ── LOCATOR HELPERS ────────────────────────────────────────────

  private async findLocator(mapping: FieldMapping): Promise<Locator> {
    const root = await this.getRoot();
    if (mapping.type === 'select') return this.findSelectInput(root, mapping);
    return this.findTextInput(root, mapping);
  }

  private async findTextInput(root: Locator, mapping: FieldMapping): Promise<Locator> {
    const inputs = root.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="radio"]):not([type="checkbox"]), textarea');
    
    // Pass entire dictionary to the browser to calculate tiebreakers natively
    const allKeywords = DICTIONARY.map(d => ({ name: d.logicalName, keywords: d.keywords }));

    const bestInputIndex = await inputs.evaluateAll((elements, data) => {
      const { targetName, allMappings } = data;
      let maxScoreForTarget = 0;
      let bestIndex = -1;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || (el as HTMLElement).offsetParent === null) continue;

        const nameAttr = (el.getAttribute('name') || '').toLowerCase();
        const idAttr = (el.getAttribute('id') || '').toLowerCase();
        const placeholderAttr = (el.getAttribute('placeholder') || '').toLowerCase();
        const ariaLabelAttr = (el.getAttribute('aria-label') || '').toLowerCase();
        
        let labelText = '';
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) labelText = label.textContent || '';
        }
        if (!labelText) {
          const parent = el.closest('label') || el.closest('div.field') || el.closest('div');
          if (parent) labelText = parent.textContent || '';
        }
        labelText = labelText.toLowerCase();

        // Score this element against ALL dictionary keys
        const scores: Record<string, number> = {};
        for (const m of allMappings) {
          scores[m.name] = 0;
          for (const rawKw of m.keywords) {
            const kw = rawKw.toLowerCase().replace(/[\*\:\?\!\-\/\|]/g, '').trim();
            if (!kw) continue;
            if (labelText.includes(kw) || ariaLabelAttr.includes(kw) || placeholderAttr.includes(kw)) scores[m.name] += 1;
            if (idAttr.includes(kw)) scores[m.name] += 2;
            if (nameAttr.includes(kw)) scores[m.name] += 2;
          }
        }

        // Did our target mapping win the tiebreaker?
        const targetScore = scores[targetName];
        if (targetScore > 0) {
          let won = true;
          for (const k in scores) {
            if (k !== targetName && scores[k] > targetScore) {
              won = false;
              break;
            }
          }
          if (won && targetScore > maxScoreForTarget) {
            maxScoreForTarget = targetScore;
            bestIndex = i;
          }
        }
      }
      return bestIndex;
    }, { targetName: mapping.logicalName, allMappings: allKeywords });

    if (bestInputIndex !== -1) {
      return inputs.nth(bestInputIndex);
    }

    throw new Error(`[FATAL] Could not resolve text field: ${mapping.logicalName}`);
  }

  private async findSelectInput(root: Locator, mapping: FieldMapping): Promise<Locator> {
    const selects = root.locator('select, [role="combobox"], [role="listbox"], input.select2-search__field, div.select__control');
    
    const allKeywords = DICTIONARY.map(d => ({ name: d.logicalName, keywords: d.keywords }));

    const bestInputIndex = await selects.evaluateAll((elements, data) => {
      const { targetName, allMappings } = data;
      let maxScoreForTarget = 0;
      let bestIndex = -1;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || (el as HTMLElement).offsetParent === null) continue;

        const nameAttr = (el.getAttribute('name') || '').toLowerCase();
        const idAttr = (el.getAttribute('id') || '').toLowerCase();
        const ariaLabelAttr = (el.getAttribute('aria-label') || '').toLowerCase();
        
        let labelText = '';
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) labelText = label.textContent || '';
        }
        if (!labelText) {
          const parent = el.closest('label') || el.closest('div.field') || el.closest('div');
          if (parent) labelText = parent.textContent || '';
        }
        labelText = labelText.toLowerCase();

        const scores: Record<string, number> = {};
        for (const m of allMappings) {
          scores[m.name] = 0;
          for (const rawKw of m.keywords) {
            const kw = rawKw.toLowerCase().replace(/[\*\:\?\!\-\/\|]/g, '').trim();
            if (!kw) continue;
            if (labelText.includes(kw) || ariaLabelAttr.includes(kw)) scores[m.name] += 1;
            if (idAttr.includes(kw)) scores[m.name] += 2;
            if (nameAttr.includes(kw)) scores[m.name] += 2;
          }
        }

        const targetScore = scores[targetName];
        if (targetScore > 0) {
          let won = true;
          for (const k in scores) {
            if (k !== targetName && scores[k] > targetScore) {
              won = false;
              break;
            }
          }
          if (won && targetScore > maxScoreForTarget) {
            maxScoreForTarget = targetScore;
            bestIndex = i;
          }
        }
      }
      return bestIndex;
    }, { targetName: mapping.logicalName, allMappings: allKeywords });

    if (bestInputIndex !== -1) {
      return selects.nth(bestInputIndex);
    }

    throw new Error(`[FATAL] Could not resolve select field: ${mapping.logicalName}`);
  }
}

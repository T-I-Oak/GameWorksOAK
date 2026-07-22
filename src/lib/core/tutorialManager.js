/**
 * TutorialManager - GameWorks OAK common portable tutorial engine.
 *
 * The manager owns tutorial progression, tooltip rendering, and mask drawing.
 * Game-specific conditions and target rectangle calculations are delegated to
 * callbacks supplied by each project.
 */
export class TutorialManager {
    /**
     * @param {Array} scenarios - Tutorial scenario records.
     * @param {object} options - Project-specific delegate handlers.
     * @param {function} options.onTriggerCondition - Checks whether a trigger can start.
     * @param {function} options.onCalculateRect - Calculates game-object highlight rectangles.
     * @param {function} options.onActionResume - Resumes the game after tutorial UI closes.
     */
    constructor(scenarios = [], options = {}) {
        this.scenarios = scenarios;
        this.displayScenarioRawIndexes = this.buildDisplayScenarioRawIndexes();
        this.state = this.normalizeState(options.initialState);
        this.currentScenarioIndex = null;
        this.currentPageIndex = 0;
        this.currentHighlightDefaults = {};
        this.isShowing = false;
        this.isAdvancing = false;

        this.onTriggerCondition = options.onTriggerCondition || (() => true);
        this.onCalculateRect = options.onCalculateRect || (() => null);
        this.onActionResume = options.onActionResume || (() => {});
        this.onSaveState = options.onSaveState || (() => {});
        this.onBeforeScenario = options.onBeforeScenario || null;
        this.onBeforeShowPage = options.onBeforeShowPage || null;
        this.onAfterShowPage = options.onAfterShowPage || null;
        this.onBeforeHidePage = options.onBeforeHidePage || null;
        this.onAfterHidePage = options.onAfterHidePage || null;
        this.onAfterScenario = options.onAfterScenario || null;
        this.nextButtonSelector = options.nextButtonSelector;
        this.nextButtonElement = null;
        this.boundNextButtonHandler = null;
        this.defaultPadding = options.defaultPadding !== undefined ? options.defaultPadding : 0;
        this.defaultRadius = options.defaultRadius !== undefined ? options.defaultRadius : 24;

        if (this.nextButtonSelector) {
            this.bindNextButton();
        }
    }

    buildDisplayScenarioRawIndexes() {
        return this.scenarios
            .map((scenario, index) => ({ scenario, index }))
            .filter(({ scenario }) => this.isDisplayScenario(scenario))
            .map(({ index }) => index);
    }

    isDisplayScenario(scenario) {
        return scenario && scenario.type !== 'defaults';
    }

    normalizeState(initialState) {
        if (!initialState || typeof initialState !== 'object' || !Array.isArray(initialState.completed)) {
            return { completed: [] };
        }

        return {
            ...initialState,
            completed: this.uniqueValues(initialState.completed)
        };
    }

    getDisplayIndex(rawIndex) {
        return this.displayScenarioRawIndexes.indexOf(rawIndex);
    }

    uniqueValues(values) {
        return [...new Set(values)];
    }

    getScenarioIdentifier(rawIndex) {
        const scenario = this.scenarios[rawIndex];
        if (scenario && scenario.id) {
            return scenario.id;
        }

        const displayIndex = this.getDisplayIndex(rawIndex);
        return displayIndex >= 0 ? displayIndex : rawIndex;
    }

    getPreviousDisplayScenarioIdentifier(rawIndex) {
        const previousRawIndex = [...this.displayScenarioRawIndexes]
            .reverse()
            .find(index => index < rawIndex);

        return previousRawIndex !== undefined ? this.getScenarioIdentifier(previousRawIndex) : null;
    }

    getScenarioRequires(rawIndex) {
        const scenario = this.scenarios[rawIndex];
        if (!scenario || !this.isDisplayScenario(scenario)) {
            return [];
        }

        if (Array.isArray(scenario.requires)) {
            return scenario.requires;
        }

        if (scenario.requires === null) {
            return [];
        }

        const previousIdentifier = this.getPreviousDisplayScenarioIdentifier(rawIndex);
        return previousIdentifier !== null ? [previousIdentifier] : [];
    }

    isScenarioCompleted(rawIndex) {
        return this.state.completed.includes(this.getScenarioIdentifier(rawIndex));
    }

    areRequiresMet(rawIndex) {
        const completed = new Set(this.state.completed);
        return this.getScenarioRequires(rawIndex).every(identifier => completed.has(identifier));
    }

    getCurrentStep() {
        return this.scenarios[this.currentScenarioIndex];
    }

    isManagedControlMode() {
        return Boolean(this.nextButtonSelector);
    }

    bindNextButton() {
        if (typeof document === 'undefined') return;

        const button = document.querySelector(this.nextButtonSelector);
        if (!button) return;

        this.nextButtonElement = button;
        this.boundNextButtonHandler = () => {
            this.handleNextButtonClick();
        };
        button.addEventListener('click', this.boundNextButtonHandler);
    }

    handleNextButtonClick() {
        if (this.isAdvancing) return;

        this.advanceScenarioAsync().catch(error => {
            setTimeout(() => {
                throw error;
            }, 0);
        });
    }

    setAdvancing(isAdvancing) {
        this.isAdvancing = isAdvancing;
        if (this.nextButtonElement) {
            this.nextButtonElement.disabled = isAdvancing;
        }
    }

    getLifecycleContext(page = this.getCurrentStep()?.pages?.[this.currentPageIndex]) {
        const scenario = this.getCurrentStep();
        return {
            scenario,
            page,
            scenarioIndex: this.getDisplayIndex(this.currentScenarioIndex),
            pageIndex: this.currentPageIndex,
            highlights: page && Array.isArray(page.highlight)
                ? page.highlight.map(highlight => this.resolveHighlight(highlight, page, scenario))
                : []
        };
    }

    applyDefaultsPatch(defaults, highlightDefaults) {
        if (highlightDefaults === null) {
            return {};
        }

        if (!highlightDefaults || typeof highlightDefaults !== 'object') {
            return defaults;
        }

        const nextDefaults = { ...defaults };
        for (const [key, value] of Object.entries(highlightDefaults)) {
            if (value === null) {
                delete nextDefaults[key];
            } else {
                nextDefaults[key] = value;
            }
        }

        return nextDefaults;
    }

    getHighlightDefaultsForRawIndex(rawIndex) {
        const defaults = {};
        let activeDefaults = defaults;
        for (let index = 0; index < rawIndex; index++) {
            const scenario = this.scenarios[index];
            if (scenario && scenario.type === 'defaults') {
                activeDefaults = this.applyDefaultsPatch(activeDefaults, scenario.highlightDefaults);
            }
        }
        return activeDefaults;
    }

    resolveHighlight(highlight, page = {}, scenario = this.getCurrentStep()) {
        return {
            ...this.currentHighlightDefaults,
            ...(scenario && scenario.highlightDefaults ? scenario.highlightDefaults : {}),
            ...(page.highlightDefaults || {}),
            ...highlight
        };
    }

    normalizePadding(padding) {
        if (padding && typeof padding === 'object') {
            return {
                x: padding.x !== undefined ? padding.x : 0,
                y: padding.y !== undefined ? padding.y : 0
            };
        }

        const value = padding !== undefined ? padding : 0;
        return { x: value, y: value };
    }

    resolvePadding(highlight) {
        const padding = highlight.padding !== undefined ? highlight.padding : this.defaultPadding;
        return this.normalizePadding(padding);
    }

    resolveRadius(highlight, width, height) {
        const requestedRadius = highlight.radius !== undefined ? highlight.radius : this.defaultRadius;
        return Math.max(0, Math.min(requestedRadius, width / 2, height / 2));
    }

    getHighlightBounds(rect, highlight) {
        const padding = this.resolvePadding(highlight);
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (highlight.shape === 'rect') {
            const width = rect.width + padding.x * 2;
            const height = rect.height + padding.y * 2;
            return {
                type: 'rect',
                left: rect.left - padding.x,
                top: rect.top - padding.y,
                width,
                height,
                radius: this.resolveRadius(highlight, width, height)
            };
        }

        if (highlight.shape === 'circle') {
            const radius = Math.max(rect.width, rect.height) / 2 + Math.max(padding.x, padding.y);
            return {
                type: 'circle',
                cx,
                cy,
                rx: radius,
                ry: radius
            };
        }

        return {
            type: 'ellipse',
            cx,
            cy,
            rx: rect.width / 2 + padding.x,
            ry: rect.height / 2 + padding.y
        };
    }

    drawRoundedRectPath(ctx, bounds) {
        const right = bounds.left + bounds.width;
        const bottom = bounds.top + bounds.height;
        const radius = bounds.radius;

        ctx.beginPath();
        ctx.moveTo(bounds.left + radius, bounds.top);
        ctx.lineTo(right - radius, bounds.top);
        ctx.quadraticCurveTo(right, bounds.top, right, bounds.top + radius);
        ctx.lineTo(right, bottom - radius);
        ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
        ctx.lineTo(bounds.left + radius, bottom);
        ctx.quadraticCurveTo(bounds.left, bottom, bounds.left, bottom - radius);
        ctx.lineTo(bounds.left, bounds.top + radius);
        ctx.quadraticCurveTo(bounds.left, bounds.top, bounds.left + radius, bounds.top);
        ctx.closePath();
    }

    /**
     * Checks whether a trigger is ready without showing the tutorial UI.
     * @param {string} triggerName - Trigger event name.
     * @param {object} context - Project state used by the trigger condition.
     * @returns {boolean} True when the tutorial would start.
     */
    willTrigger(triggerName, context) {
        if (this.isShowing) {
            return false;
        }

        return this.findTriggeredScenario(triggerName, context) !== null;
    }

    /**
     * Checks a trigger and starts the tutorial when the condition is met.
     * @param {string} triggerName - Trigger event name.
     * @param {object} context - Project state used by the trigger condition.
     * @returns {boolean} True when the tutorial UI was shown.
     */
    checkTrigger(triggerName, context) {
        if (this.isShowing) {
            return false;
        }

        const triggeredScenario = this.findTriggeredScenario(triggerName, context);

        if (triggeredScenario) {
            this.currentScenarioIndex = triggeredScenario.rawIndex;
            this.currentHighlightDefaults = triggeredScenario.highlightDefaults;
            this.isShowing = true;
            this.currentPageIndex = 0;
            const currentStep = this.getCurrentStep();

            if (this.isManagedControlMode()) {
                this.startScenarioAsync(currentStep.pages[0]).catch(error => {
                    setTimeout(() => {
                        throw error;
                    }, 0);
                });
            } else {
                this.showPage(currentStep.pages[0]);
            }
            return true;
        }

        return false;
    }

    findTriggeredScenario(triggerName, context) {
        let activeDefaults = {};

        for (let rawIndex = 0; rawIndex < this.scenarios.length; rawIndex++) {
            const scenario = this.scenarios[rawIndex];
            if (!scenario) continue;

            if (scenario.type === 'defaults') {
                activeDefaults = this.applyDefaultsPatch(activeDefaults, scenario.highlightDefaults);
                continue;
            }

            if (!this.isDisplayScenario(scenario)) continue;
            if (this.isScenarioCompleted(rawIndex)) continue;
            if (scenario.trigger !== triggerName) continue;
            if (!this.areRequiresMet(rawIndex)) continue;
            if (!this.onTriggerCondition(triggerName, context)) continue;

            return {
                rawIndex,
                highlightDefaults: { ...activeDefaults }
            };
        }

        return null;
    }

    /**
     * Renders the requested page into the tooltip UI.
     * @param {object} page - Page data to display.
     */
    showTooltip(page) {
        const tooltipEl = document.getElementById('tutorial-tooltip');
        const titleEl = document.getElementById('tutorial-title');
        const msgEl = document.getElementById('tutorial-message');

        if (!tooltipEl) return;

        const currentStep = this.getCurrentStep();
        if (titleEl) titleEl.textContent = currentStep.title;
        if (msgEl) msgEl.textContent = page.message;

        tooltipEl.classList.remove('hidden');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.positionTooltip(page);
            });
        });
    }

    showMask() {
        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (maskCanvas) {
            maskCanvas.classList.remove('hidden');
            this.resizeMask();
        }
    }

    showPage(page) {
        this.showTooltip(page);
        this.showMask();
    }

    async startScenarioAsync(page) {
        this.setAdvancing(true);
        try {
            const context = this.getLifecycleContext(page);
            if (this.onBeforeScenario) {
                await Promise.resolve(this.onBeforeScenario(context));
            }
            await this.showPageAsync(page, { controlProgress: false });
        } finally {
            this.setAdvancing(false);
        }
    }

    async showPageAsync(page, options = {}) {
        const shouldControlProgress = options.controlProgress !== false;
        if (shouldControlProgress) {
            this.setAdvancing(true);
        }
        try {
            const context = this.getLifecycleContext(page);
            if (this.onBeforeShowPage) {
                await Promise.resolve(this.onBeforeShowPage(context));
            }

            this.showPage(page);

            if (this.onAfterShowPage) {
                await Promise.resolve(this.onAfterShowPage(context));
            }
        } finally {
            if (shouldControlProgress) {
                this.setAdvancing(false);
            }
        }
    }

    async hidePageAsync(page = this.getCurrentStep()?.pages?.[this.currentPageIndex], options = {}) {
        const shouldControlProgress = options.controlProgress !== false;
        if (shouldControlProgress) {
            this.setAdvancing(true);
        }
        try {
            const context = this.getLifecycleContext(page);
            if (this.onBeforeHidePage) {
                await Promise.resolve(this.onBeforeHidePage(context));
            }

            this.hideTutorialUi();

            if (this.onAfterHidePage) {
                await Promise.resolve(this.onAfterHidePage(context));
            }
            return context;
        } finally {
            if (shouldControlProgress) {
                this.setAdvancing(false);
            }
        }
    }

    /**
     * Positions the tooltip around the first highlight in the current page.
     * @param {object} page - Page data to display.
     */
    positionTooltip(page) {
        const tooltipEl = document.getElementById('tutorial-tooltip');
        if (!tooltipEl || !page.highlight || page.highlight.length === 0) return;

        const primaryHl = this.resolveHighlight(page.highlight[0], page);
        const rect = this.calculateHighlightTargetRect(primaryHl);
        if (!rect) return;

        const arrowEl = tooltipEl.querySelector('.tooltip-arrow');
        if (arrowEl) {
            arrowEl.className = 'tooltip-arrow';
        }

        const tooltipWidth = tooltipEl.offsetWidth || 320;
        const tooltipHeight = tooltipEl.offsetHeight || 140;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const bounds = this.getHighlightBounds(rect, primaryHl);
        const borderTop = bounds.type === 'rect' ? bounds.top : cy - bounds.ry;
        const borderBottom = bounds.type === 'rect' ? bounds.top + bounds.height : cy + bounds.ry;

        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
        const spaceAbove = borderTop;
        const spaceBelow = viewportHeight - borderBottom;
        const placeBelow = spaceBelow > spaceAbove;

        let topPos;
        if (placeBelow) {
            topPos = borderBottom + 8;
            if (arrowEl) arrowEl.classList.add('arrow-up');
        } else {
            topPos = borderTop - tooltipHeight - 8;
            if (arrowEl) arrowEl.classList.add('arrow-down');
        }

        const leftPos = cx - tooltipWidth / 2;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const clampedTop = Math.max(10, Math.min(viewportHeight - tooltipHeight - 10, topPos));
        const clampedLeft = Math.max(10, Math.min(viewportWidth - tooltipWidth - 10, leftPos));

        tooltipEl.style.top = `${clampedTop}px`;
        tooltipEl.style.left = `${clampedLeft}px`;

        if (arrowEl) {
            const arrowOffset = cx - clampedLeft;
            const arrowHalfWidth = (arrowEl.offsetWidth || 0) / 2;
            const arrowLeft = arrowOffset - arrowHalfWidth;
            arrowEl.style.left = `${Math.max(16, Math.min(tooltipWidth - 16, arrowLeft))}px`;
        }
    }

    /**
     * Calculates the absolute screen rectangle for a highlight target.
     * @param {object} hl - Highlight data.
     * @returns {object|null} Rectangle object.
     */
    calculateHighlightTargetRect(hl) {
        if (hl.elementId && (!hl.targetType || hl.targetType === 'element-only')) {
            const el = document.getElementById(hl.elementId);
            if (el) {
                const r = el.getBoundingClientRect();
                return {
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height
                };
            }
        }

        return this.onCalculateRect(hl);
    }

    /**
     * Resizes the tutorial mask canvas to the viewport.
     */
    resizeMask() {
        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (!maskCanvas || maskCanvas.classList.contains('hidden')) return;

        maskCanvas.width = window.innerWidth;
        maskCanvas.height = window.innerHeight;
    }

    /**
     * Redraws the dimming mask and highlight cutouts.
     */
    updateMask() {
        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (!maskCanvas || maskCanvas.classList.contains('hidden')) return;

        if (maskCanvas.width !== window.innerWidth || maskCanvas.height !== window.innerHeight) {
            this.resizeMask();
        }

        const ctx = maskCanvas.getContext('2d');
        const width = maskCanvas.width;
        const height = maskCanvas.height;

        const computed = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
        const maskColor = computed ? (computed.getPropertyValue('--tutorial-mask-color').trim() || 'rgba(0, 0, 0, 0.65)') : 'rgba(0, 0, 0, 0.65)';
        const strokeColor = computed ? (computed.getPropertyValue('--tutorial-highlight-stroke').trim() || 'transparent') : 'transparent';
        const shadowColor = computed ? (computed.getPropertyValue('--tutorial-highlight-shadow').trim() || 'transparent') : 'transparent';
        const shadowBlur = computed ? parseInt(computed.getPropertyValue('--tutorial-highlight-shadow-blur').trim() || '0', 10) : 0;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = maskColor;
        ctx.fillRect(0, 0, width, height);

        const currentStep = this.getCurrentStep();
        if (!currentStep) return;
        const page = currentStep.pages[this.currentPageIndex];
        if (!page || !page.highlight) return;

        ctx.globalCompositeOperation = 'destination-out';

        page.highlight.forEach(sourceHighlight => {
            const hl = this.resolveHighlight(sourceHighlight, page, currentStep);
            const rect = this.calculateHighlightTargetRect(hl);
            if (!rect) return;

            const bounds = this.getHighlightBounds(rect, hl);

            if (bounds.type === 'rect') {
                this.drawRoundedRectPath(ctx, bounds);
                ctx.fill();
            } else {
                const rx = Math.max(0, bounds.rx);
                const ry = Math.max(0, bounds.ry);

                ctx.save();
                ctx.translate(bounds.cx, bounds.cy);
                ctx.scale(1, rx === 0 ? 1 : ry / rx);

                const grad = ctx.createRadialGradient(0, 0, Math.max(0, rx - 4), 0, 0, rx);
                grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;

                ctx.beginPath();
                ctx.arc(0, 0, rx, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;

        if (shadowColor !== 'transparent' && shadowBlur > 0) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
        }

        page.highlight.forEach(sourceHighlight => {
            const hl = this.resolveHighlight(sourceHighlight, page, currentStep);
            const rect = this.calculateHighlightTargetRect(hl);
            if (!rect) return;

            const bounds = this.getHighlightBounds(rect, hl);

            if (bounds.type === 'rect') {
                this.drawRoundedRectPath(ctx, bounds);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.ellipse(bounds.cx, bounds.cy, Math.max(0, bounds.rx), Math.max(0, bounds.ry), 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        ctx.shadowBlur = 0;
    }

    /**
     * Advances the current tutorial page, or completes the current scenario.
     */
    advanceScenario() {
        if (this.isManagedControlMode()) {
            throw new Error('TutorialManager: advanceScenario() cannot be called when nextButtonSelector is used.');
        }

        if (!this.isShowing) return;

        const currentStep = this.getCurrentStep();

        if (this.currentPageIndex < currentStep.pages.length - 1) {
            this.currentPageIndex++;
            this.showTooltip(currentStep.pages[this.currentPageIndex]);
        } else {
            this.currentPageIndex = 0;
            this.completeCurrentScenario();
            this.isShowing = false;
            this.currentScenarioIndex = null;
            this.currentHighlightDefaults = {};

            const tooltipEl = document.getElementById('tutorial-tooltip');
            if (tooltipEl) tooltipEl.classList.add('hidden');

            const maskCanvas = document.getElementById('tutorial-mask-canvas');
            if (maskCanvas) maskCanvas.classList.add('hidden');

            this.onActionResume();
        }
    }

    async advanceScenarioAsync() {
        if (!this.isShowing || this.isAdvancing) return;

        this.setAdvancing(true);
        try {
            const currentStep = this.getCurrentStep();
            const currentPage = currentStep.pages[this.currentPageIndex];
            const context = await this.hidePageAsync(currentPage, { controlProgress: false });

            if (this.currentPageIndex < currentStep.pages.length - 1) {
                this.currentPageIndex++;
                await this.showPageAsync(currentStep.pages[this.currentPageIndex], { controlProgress: false });
            } else {
                this.currentPageIndex = 0;
                this.completeCurrentScenario();

                if (this.onAfterScenario) {
                    await Promise.resolve(this.onAfterScenario(context));
                }

                this.isShowing = false;
                this.currentScenarioIndex = null;
                this.currentHighlightDefaults = {};
                this.onActionResume();
            }
        } finally {
            this.setAdvancing(false);
        }
    }

    completeCurrentScenario() {
        if (this.currentScenarioIndex === null) return;

        this.state = {
            ...this.state,
            completed: this.uniqueValues([
                ...this.state.completed,
                this.getScenarioIdentifier(this.currentScenarioIndex)
            ])
        };
        this.onSaveState(this.getState());
    }

    getState() {
        return {
            ...this.state,
            completed: [...this.state.completed]
        };
    }

    /**
     * Resets tutorial state to the initial empty completed list.
     */
    resetTutorial() {
        if (this.isManagedControlMode()) {
            this.resetTutorialAsync().catch(error => {
                setTimeout(() => {
                    throw error;
                }, 0);
            });
            return;
        }

        this.resetTutorialStateAndHide();
    }

    async resetTutorialAsync() {
        if (this.isAdvancing) return;

        this.setAdvancing(true);
        try {
            if (this.isShowing) {
                await this.hidePageAsync(undefined, { controlProgress: false });
            }
            this.resetTutorialStateAndHide();
        } finally {
            this.setAdvancing(false);
        }
    }

    resetTutorialStateAndHide() {
        this.state = { completed: [] };
        this.onSaveState(this.getState());
        this.currentScenarioIndex = null;
        this.currentPageIndex = 0;
        this.currentHighlightDefaults = {};
        this.isShowing = false;

        this.hideTutorialUi();
        this.onActionResume();
    }

    hideTutorialUi() {
        const tooltipEl = document.getElementById('tutorial-tooltip');
        if (tooltipEl) tooltipEl.classList.add('hidden');

        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (maskCanvas) maskCanvas.classList.add('hidden');
    }
}

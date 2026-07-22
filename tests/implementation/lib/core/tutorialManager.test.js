import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TutorialManager } from '../../../../src/lib/core/tutorialManager.js';

const mockScenarios = [
    {
        id: 'welcome',
        trigger: 'turnStart',
        title: 'Welcome',
        pages: [
            {
                message: 'First page',
                highlight: [
                    { targetType: 'board', shape: 'rect' }
                ]
            },
            {
                message: 'Second page',
                highlight: [
                    { elementId: 'help-button', shape: 'circle' }
                ]
            }
        ]
    },
    {
        id: 'next',
        trigger: 'afterAction',
        title: 'Next',
        pages: [
            {
                message: 'Next scenario',
                highlight: [
                    { targetType: 'piece', shape: 'circle' }
                ]
            }
        ]
    }
];

function createDeferred() {
    let resolve;
    const promise = new Promise(resolvePromise => {
        resolve = resolvePromise;
    });

    return { promise, resolve };
}

async function flushPromises() {
    for (let index = 0; index < 5; index++) {
        await Promise.resolve();
    }
}

describe('TutorialManager common module', () => {
    let manager;
    let options;
    let mockCtx;

    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', (callback) => callback());

        mockCtx = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            arc: vi.fn(),
            ellipse: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            createRadialGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            shadowColor: '',
            shadowBlur: 0,
            globalCompositeOperation: '',
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0
        };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);

        document.body.innerHTML = `
            <button id="help-button">Help</button>
            <button id="primary-target">Primary</button>
            <button id="secondary-target">Secondary</button>
            <button id="canvas-owned-target">Canvas Owned</button>
            <button id="tutorial-next-btn">Next</button>
            <canvas id="tutorial-mask-canvas" class="hidden"></canvas>
            <div id="tutorial-tooltip" class="hidden">
                <div class="tooltip-arrow"></div>
                <h3 id="tutorial-title"></h3>
                <p id="tutorial-message"></p>
            </div>
        `;

        document.getElementById('help-button').getBoundingClientRect = () => ({
            top: 11,
            left: 13,
            width: 55,
            height: 21
        });

        options = {
            onTriggerCondition: vi.fn((triggerName, context) => context.allowedTriggers.includes(triggerName)),
            onCalculateRect: vi.fn(() => ({ top: 10, left: 20, width: 200, height: 120 })),
            onActionResume: vi.fn(),
            onSaveState: vi.fn(),
            elementScrollDelayMs: 0
        };

        manager = new TutorialManager(mockScenarios, options);
    });

    test('starts from provided scenarios and delegated trigger condition', () => {
        const triggered = manager.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });

        expect(triggered).toBe(true);
        expect(manager.isShowing).toBe(true);
        expect(options.onTriggerCondition).toHaveBeenCalledWith('turnStart', { allowedTriggers: ['turnStart'] });
        expect(document.getElementById('tutorial-title').textContent).toBe('Welcome');
        expect(document.getElementById('tutorial-message').textContent).toBe('First page');
    });

    test('willTrigger checks conditions without showing UI', () => {
        const willTrigger = manager.willTrigger('turnStart', { allowedTriggers: ['turnStart'] });

        expect(willTrigger).toBe(true);
        expect(manager.isShowing).toBe(false);
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);
    });

    test('uses DOM element rects directly when elementId is provided', () => {
        const rect = manager.calculateHighlightTargetRect({
            elementId: 'help-button',
            shape: 'circle'
        });

        expect(rect).toEqual({
            top: 11,
            left: 13,
            width: 55,
            height: 21
        });
        expect(options.onCalculateRect).not.toHaveBeenCalled();
    });

    test('advances pages and saves scenario progress on completion', () => {
        manager.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });

        manager.advanceScenario();
        expect(manager.currentPageIndex).toBe(1);
        expect(document.getElementById('tutorial-message').textContent).toBe('Second page');

        manager.advanceScenario();
        expect(manager.currentScenarioIndex).toBe(null);
        expect(manager.currentPageIndex).toBe(0);
        expect(manager.isShowing).toBe(false);
        expect(options.onSaveState).toHaveBeenCalledWith({ completed: ['welcome'] });
        expect(options.onActionResume).toHaveBeenCalledTimes(1);
        expect(manager.willTrigger('afterAction', { allowedTriggers: ['afterAction'] })).toBe(true);
    });

    test('draws mask highlights with CSS custom properties', () => {
        manager.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });

        expect(() => manager.updateMask()).not.toThrow();
        expect(mockCtx.fillRect).toHaveBeenCalled();
        expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
    });

    test('supports initialState and reset persistence', () => {
        const resumed = new TutorialManager(mockScenarios, {
            ...options,
            initialState: { completed: ['welcome'] },
            defaultPadding: 12,
            defaultRadius: 6
        });

        expect(resumed.willTrigger('afterAction', { allowedTriggers: ['afterAction'] })).toBe(true);
        expect(resumed.defaultPadding).toBe(12);
        expect(resumed.defaultRadius).toBe(6);

        resumed.resetTutorial();
        expect(resumed.getState()).toEqual({ completed: [] });
        expect(options.onSaveState).toHaveBeenCalledWith({ completed: [] });
    });

    test('uses completed state and implicit requires while skipping defaults records', () => {
        const scenarios = [
            { type: 'defaults', highlightDefaults: { shape: 'rect', padding: 4 } },
            mockScenarios[0],
            { type: 'defaults', highlightDefaults: { radius: 0 } },
            mockScenarios[1]
        ];
        const resumed = new TutorialManager(scenarios, {
            ...options,
            initialState: { completed: ['welcome'] }
        });

        expect(resumed.willTrigger('afterAction', { allowedTriggers: ['afterAction'] })).toBe(true);

        resumed.checkTrigger('afterAction', { allowedTriggers: ['afterAction'] });
        resumed.advanceScenario();

        expect(options.onSaveState).toHaveBeenCalledWith({ completed: ['welcome', 'next'] });
    });

    test('starts from the first scenario when initialState is omitted or invalid', () => {
        const invalidStateManager = new TutorialManager(mockScenarios, {
            ...options,
            initialState: { completed: 'welcome' }
        });

        expect(invalidStateManager.getState()).toEqual({ completed: [] });
        expect(invalidStateManager.willTrigger('turnStart', { allowedTriggers: ['turnStart'] })).toBe(true);
    });

    test('supports branching and joins through requires', () => {
        const scenarios = [
            { id: 'scenario-1', trigger: 'start', title: 'Start', pages: mockScenarios[1].pages },
            { id: 'scenario-a2', trigger: 'screenA', title: 'A2', requires: ['scenario-1'], pages: mockScenarios[1].pages },
            { id: 'scenario-a3', trigger: 'screenADetail', title: 'A3', pages: mockScenarios[1].pages },
            { id: 'scenario-b2', trigger: 'screenB', title: 'B2', requires: ['scenario-1'], pages: mockScenarios[1].pages },
            { id: 'scenario-b3', trigger: 'screenBDetail', title: 'B3', pages: mockScenarios[1].pages },
            { id: 'scenario-4', trigger: 'joined', title: 'Joined', requires: ['scenario-a3', 'scenario-b3'], pages: mockScenarios[1].pages }
        ];
        const branched = new TutorialManager(scenarios, options);

        expect(branched.checkTrigger('screenA', { allowedTriggers: ['screenA'] })).toBe(false);

        expect(branched.checkTrigger('start', { allowedTriggers: ['start'] })).toBe(true);
        branched.advanceScenario();
        expect(options.onSaveState).toHaveBeenLastCalledWith({ completed: ['scenario-1'] });

        expect(branched.checkTrigger('screenB', { allowedTriggers: ['screenB'] })).toBe(true);
        branched.advanceScenario();
        expect(options.onSaveState).toHaveBeenLastCalledWith({ completed: ['scenario-1', 'scenario-b2'] });

        expect(branched.checkTrigger('screenA', { allowedTriggers: ['screenA'] })).toBe(true);
        branched.advanceScenario();
        expect(options.onSaveState).toHaveBeenLastCalledWith({ completed: ['scenario-1', 'scenario-b2', 'scenario-a2'] });

        expect(branched.checkTrigger('screenADetail', { allowedTriggers: ['screenADetail'] })).toBe(true);
        branched.advanceScenario();
        expect(branched.checkTrigger('joined', { allowedTriggers: ['joined'] })).toBe(false);

        expect(branched.checkTrigger('screenBDetail', { allowedTriggers: ['screenBDetail'] })).toBe(true);
        branched.advanceScenario();
        expect(branched.checkTrigger('joined', { allowedTriggers: ['joined'] })).toBe(true);
    });

    test('applies defaults records in definition order and supports clearing defaults', () => {
        const scenarios = [
            { type: 'defaults', highlightDefaults: { shape: 'rect', padding: { x: 10, y: 5 }, radius: 0 } },
            mockScenarios[0],
            { type: 'defaults', highlightDefaults: { radius: 3, padding: null } },
            mockScenarios[1]
        ];
        const resumed = new TutorialManager(scenarios, {
            ...options,
            initialState: { completed: ['welcome'] }
        });

        resumed.checkTrigger('afterAction', { allowedTriggers: ['afterAction'] });
        const resolved = resumed.resolveHighlight({ targetType: 'piece' }, mockScenarios[1].pages[0]);
        expect(resolved).toMatchObject({
            shape: 'rect',
            radius: 3
        });
        expect(resolved).not.toHaveProperty('padding');
    });

    test('supports clearing all accumulated defaults with highlightDefaults null', () => {
        const scenarios = [
            { type: 'defaults', highlightDefaults: { shape: 'rect', padding: { x: 10, y: 5 }, radius: 0 } },
            mockScenarios[0],
            { type: 'defaults', highlightDefaults: null },
            mockScenarios[1]
        ];
        const resumed = new TutorialManager(scenarios, {
            ...options,
            initialState: { completed: ['welcome'] }
        });

        resumed.checkTrigger('afterAction', { allowedTriggers: ['afterAction'] });
        const resolved = resumed.resolveHighlight({ targetType: 'piece' }, mockScenarios[1].pages[0]);
        expect(resolved).toEqual({ targetType: 'piece' });
    });

    test('managed control mode waits for scenario and before-show hooks before showing UI', async () => {
        const beforeScenario = createDeferred();
        const beforeShow = createDeferred();
        const onBeforeScenario = vi.fn(() => beforeScenario.promise);
        const onBeforeShowPage = vi.fn(() => beforeShow.promise);
        const onAfterShowPage = vi.fn();
        const managed = new TutorialManager(mockScenarios, {
            ...options,
            nextButtonSelector: '#tutorial-next-btn',
            onBeforeScenario,
            onBeforeShowPage,
            onAfterShowPage
        });
        const button = document.getElementById('tutorial-next-btn');

        const triggered = managed.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });

        expect(triggered).toBe(true);
        expect(button.disabled).toBe(true);
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);
        expect(onBeforeScenario).toHaveBeenCalledWith(expect.objectContaining({
            scenario: mockScenarios[0],
            page: mockScenarios[0].pages[0],
            scenarioIndex: 0,
            pageIndex: 0
        }));
        expect(onBeforeShowPage).not.toHaveBeenCalled();

        beforeScenario.resolve();
        await flushPromises();
        expect(onBeforeShowPage).toHaveBeenCalledWith(expect.objectContaining({
            scenario: mockScenarios[0],
            page: mockScenarios[0].pages[0],
            scenarioIndex: 0,
            pageIndex: 0
        }));
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);

        beforeShow.resolve();
        await flushPromises();

        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('tutorial-message').textContent).toBe('First page');
        expect(onAfterShowPage).toHaveBeenCalledWith(expect.objectContaining({
            scenario: mockScenarios[0],
            page: mockScenarios[0].pages[0],
            scenarioIndex: 0,
            pageIndex: 0,
            highlights: [expect.objectContaining({ targetType: 'board', shape: 'rect' })]
        }));
        expect(button.disabled).toBe(false);
    });

    test('managed control mode hides the current page before showing the next page', async () => {
        const beforeHide = createDeferred();
        const onBeforeHidePage = vi.fn(() => beforeHide.promise);
        const onAfterHidePage = vi.fn();
        const onBeforeShowPage = vi.fn();
        const onAfterShowPage = vi.fn();
        const managed = new TutorialManager(mockScenarios, {
            ...options,
            nextButtonSelector: '#tutorial-next-btn',
            onBeforeHidePage,
            onAfterHidePage,
            onBeforeShowPage,
            onAfterShowPage
        });
        const button = document.getElementById('tutorial-next-btn');

        managed.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });
        await flushPromises();

        expect(() => managed.advanceScenario()).toThrow('nextButtonSelector');

        button.click();
        expect(button.disabled).toBe(true);
        expect(onBeforeHidePage).toHaveBeenCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[0],
            pageIndex: 0
        }));
        expect(document.getElementById('tutorial-message').textContent).toBe('First page');

        beforeHide.resolve();
        await flushPromises();

        expect(onAfterHidePage).toHaveBeenCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[0],
            pageIndex: 0
        }));
        expect(onBeforeShowPage).toHaveBeenLastCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[1],
            pageIndex: 1
        }));
        expect(document.getElementById('tutorial-message').textContent).toBe('Second page');
        expect(onAfterShowPage).toHaveBeenLastCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[1],
            pageIndex: 1
        }));
        await flushPromises();
        expect(button.disabled).toBe(false);
    });

    test('managed control mode runs page hide and scenario hooks before completing a scenario', async () => {
        const beforeHide = createDeferred();
        const onBeforeHidePage = vi.fn(context => (
            context.pageIndex === 1 ? beforeHide.promise : undefined
        ));
        const onAfterHidePage = vi.fn();
        const onAfterScenario = vi.fn();
        const managed = new TutorialManager(mockScenarios, {
            ...options,
            nextButtonSelector: '#tutorial-next-btn',
            onBeforeHidePage,
            onAfterHidePage,
            onAfterScenario
        });
        const button = document.getElementById('tutorial-next-btn');

        managed.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });
        await flushPromises();

        button.click();
        await flushPromises();
        expect(document.getElementById('tutorial-message').textContent).toBe('Second page');

        button.click();
        expect(button.disabled).toBe(true);
        expect(onBeforeHidePage).toHaveBeenLastCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[1],
            pageIndex: 1
        }));
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(false);

        beforeHide.resolve();
        await flushPromises();

        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);
        expect(onAfterHidePage).toHaveBeenLastCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[1],
            pageIndex: 1
        }));
        expect(onAfterScenario).toHaveBeenCalledWith(expect.objectContaining({
            scenario: mockScenarios[0],
            page: mockScenarios[0].pages[1],
            scenarioIndex: 0,
            pageIndex: 1
        }));
        expect(options.onSaveState).toHaveBeenCalledWith({ completed: ['welcome'] });
        expect(button.disabled).toBe(false);
    });

    test('managed control mode waits for page hide hook before reset hides UI', async () => {
        const beforeHide = createDeferred();
        const onBeforeHidePage = vi.fn(() => beforeHide.promise);
        const onAfterHidePage = vi.fn();
        const managed = new TutorialManager(mockScenarios, {
            ...options,
            nextButtonSelector: '#tutorial-next-btn',
            onBeforeHidePage,
            onAfterHidePage
        });
        const button = document.getElementById('tutorial-next-btn');

        managed.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });
        await flushPromises();
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(false);

        managed.resetTutorial();
        expect(button.disabled).toBe(true);
        expect(onBeforeHidePage).toHaveBeenCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[0],
            pageIndex: 0
        }));
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(false);

        beforeHide.resolve();
        await flushPromises();

        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);
        expect(onAfterHidePage).toHaveBeenCalledWith(expect.objectContaining({
            page: mockScenarios[0].pages[0],
            pageIndex: 0
        }));
        expect(options.onSaveState).toHaveBeenCalledWith({ completed: [] });
        expect(button.disabled).toBe(false);
    });

    test('calculates padding, circle, ellipse, and clamped rect radius', () => {
        const geometryManager = new TutorialManager(mockScenarios, {
            ...options,
            defaultPadding: { x: 4, y: 6 },
            defaultRadius: 100
        });
        const rect = { top: 20, left: 10, width: 40, height: 12 };

        expect(geometryManager.getHighlightBounds(rect, { shape: 'rect' })).toEqual({
            type: 'rect',
            left: 6,
            top: 14,
            width: 48,
            height: 24,
            radius: 12
        });

        expect(geometryManager.getHighlightBounds(rect, { shape: 'ellipse', padding: { x: 2, y: 8 } })).toMatchObject({
            type: 'ellipse',
            cx: 30,
            cy: 26,
            rx: 22,
            ry: 14
        });

        expect(geometryManager.getHighlightBounds(rect, { shape: 'circle', padding: { x: 2, y: 8 } })).toMatchObject({
            type: 'circle',
            cx: 30,
            cy: 26,
            rx: 28,
            ry: 28
        });
    });

    test('scrolls DOM element highlights in reverse order before showing the page', () => {
        const scrollOrder = [];
        document.getElementById('primary-target').scrollIntoView = vi.fn(() => scrollOrder.push('primary'));
        document.getElementById('secondary-target').scrollIntoView = vi.fn(() => scrollOrder.push('secondary'));
        document.getElementById('canvas-owned-target').scrollIntoView = vi.fn(() => scrollOrder.push('canvas-owned'));

        manager.scrollElementHighlightsIntoView({
            message: 'Scroll targets',
            highlight: [
                { elementId: 'primary-target' },
                { elementId: 'canvas-owned-target', targetType: 'canvas-target' },
                { elementId: 'secondary-target' }
            ]
        });

        expect(scrollOrder).toEqual(['secondary', 'primary']);
        expect(document.getElementById('primary-target').scrollIntoView).toHaveBeenCalledWith({
            block: 'center',
            inline: 'nearest',
            behavior: 'smooth'
        });
        expect(document.getElementById('canvas-owned-target').scrollIntoView).not.toHaveBeenCalled();
    });

    test('waits briefly after smooth element scrolling before rendering the page', async () => {
        vi.useFakeTimers();
        const delayedManager = new TutorialManager(mockScenarios, {
            ...options,
            elementScrollDelayMs: 350
        });
        delayedManager.currentScenarioIndex = 0;
        document.getElementById('primary-target').scrollIntoView = vi.fn();

        const showing = delayedManager.showPage({
            message: 'Delayed scroll',
            highlight: [
                { elementId: 'primary-target' }
            ]
        });

        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);
        await vi.advanceTimersByTimeAsync(349);
        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(true);
        await vi.advanceTimersByTimeAsync(1);
        await showing;

        expect(document.getElementById('tutorial-tooltip').classList.contains('hidden')).toBe(false);
        vi.useRealTimers();
    });

    test('keeps tooltip inside viewport and points arrow at the highlight center after horizontal clamp', () => {
        const tooltipEl = document.getElementById('tutorial-tooltip');
        const arrowEl = tooltipEl.querySelector('.tooltip-arrow');
        const positionedManager = new TutorialManager(mockScenarios, {
            ...options,
            onCalculateRect: vi.fn(() => ({ top: 10, left: 220, width: 80, height: 120 }))
        });
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 160 });
        Object.defineProperty(tooltipEl, 'offsetWidth', { configurable: true, value: 180 });
        Object.defineProperty(tooltipEl, 'offsetHeight', { configurable: true, value: 90 });
        Object.defineProperty(arrowEl, 'offsetWidth', { configurable: true, value: 16 });

        positionedManager.positionTooltip({
            highlight: [
                { targetType: 'board', shape: 'rect' }
            ]
        });

        expect(tooltipEl.style.left).toBe('110px');
        expect(tooltipEl.style.top).toBe('60px');
        expect(arrowEl.style.left).toBe('142px');
    });
});

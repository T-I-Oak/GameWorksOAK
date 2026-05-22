import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TutorialManager } from '../../../../src/lib/core/tutorialManager.js';

const mockScenarios = [
    {
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
            onSaveIndex: vi.fn()
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
        expect(manager.currentScenarioIndex).toBe(1);
        expect(manager.currentPageIndex).toBe(0);
        expect(manager.isShowing).toBe(false);
        expect(options.onSaveIndex).toHaveBeenCalledWith(1);
        expect(options.onActionResume).toHaveBeenCalledTimes(1);
    });

    test('draws mask highlights with CSS custom properties', () => {
        manager.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });

        expect(() => manager.updateMask()).not.toThrow();
        expect(mockCtx.fillRect).toHaveBeenCalled();
        expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
    });

    test('supports initialScenarioIndex and reset persistence', () => {
        const resumed = new TutorialManager(mockScenarios, {
            ...options,
            initialScenarioIndex: 1,
            defaultPadding: 12,
            defaultRadius: 6
        });

        expect(resumed.currentScenarioIndex).toBe(1);
        expect(resumed.defaultPadding).toBe(12);
        expect(resumed.defaultRadius).toBe(6);

        resumed.resetTutorial();
        expect(resumed.currentScenarioIndex).toBe(0);
        expect(options.onSaveIndex).toHaveBeenCalledWith(0);
    });

    test('uses display indexes for external progress and skips defaults records', () => {
        const scenarios = [
            { type: 'defaults', highlightDefaults: { shape: 'rect', padding: 4 } },
            mockScenarios[0],
            { type: 'defaults', highlightDefaults: { radius: 0 } },
            mockScenarios[1]
        ];
        const resumed = new TutorialManager(scenarios, {
            ...options,
            initialScenarioIndex: 1
        });

        expect(resumed.currentScenarioIndex).toBe(3);
        expect(resumed.willTrigger('afterAction', { allowedTriggers: ['afterAction'] })).toBe(true);

        resumed.checkTrigger('afterAction', { allowedTriggers: ['afterAction'] });
        resumed.advanceScenario();

        expect(options.onSaveIndex).toHaveBeenCalledWith(2);
    });

    test('prefers scenario id for restore and saved progress', () => {
        const scenarios = [
            { id: 'intro', trigger: 'turnStart', title: 'Intro', pages: mockScenarios[0].pages },
            { type: 'defaults', highlightDefaults: { padding: { x: 8, y: 2 } } },
            { id: 'action', trigger: 'afterAction', title: 'Action', pages: mockScenarios[1].pages }
        ];
        const resumed = new TutorialManager(scenarios, {
            ...options,
            initialScenarioIndex: 'intro'
        });

        resumed.checkTrigger('turnStart', { allowedTriggers: ['turnStart'] });
        resumed.advanceScenario();
        resumed.advanceScenario();

        expect(options.onSaveIndex).toHaveBeenCalledWith('action');

        resumed.resetTutorial();
        expect(options.onSaveIndex).toHaveBeenCalledWith('intro');
    });

    test('applies defaults records before restored display scenarios', () => {
        const scenarios = [
            { type: 'defaults', highlightDefaults: { shape: 'rect', padding: { x: 10, y: 5 }, radius: 0 } },
            mockScenarios[0],
            { type: 'defaults', highlightDefaults: { radius: 3 } },
            mockScenarios[1]
        ];
        const resumed = new TutorialManager(scenarios, {
            ...options,
            initialScenarioIndex: 1
        });

        const resolved = resumed.resolveHighlight({ targetType: 'piece' }, mockScenarios[1].pages[0]);
        expect(resolved).toMatchObject({
            shape: 'rect',
            padding: { x: 10, y: 5 },
            radius: 3
        });
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
});

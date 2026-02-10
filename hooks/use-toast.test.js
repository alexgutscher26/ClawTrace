import { describe, expect, test } from 'bun:test';
import { reducer, TOAST_LIMIT } from './use-toast';

describe('use-toast reducer', () => {
  test(`ADD_TOAST adds a toast and respects TOAST_LIMIT (${TOAST_LIMIT})`, () => {
    const initialState = { toasts: [] };
    const toast1 = { id: '1', title: 'Toast 1', open: true };

    // Add first toast
    let state = reducer(initialState, { type: 'ADD_TOAST', toast: toast1 });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(toast1);

    // Add second toast
    const toast2 = { id: '2', title: 'Toast 2', open: true };
    state = reducer(state, { type: 'ADD_TOAST', toast: toast2 });

    // Should still have length TOAST_LIMIT
    expect(state.toasts).toHaveLength(TOAST_LIMIT);
    // Since slice(0, TOAST_LIMIT) is used and new toast is prepended,
    // if TOAST_LIMIT is 1, only the new one remains.
    if (TOAST_LIMIT === 1) {
      expect(state.toasts[0]).toEqual(toast2);
    } else {
      expect(state.toasts[0]).toEqual(toast2);
      expect(state.toasts[1]).toEqual(toast1);
    }
  });

  test('UPDATE_TOAST updates an existing toast', () => {
    const toast1 = { id: '1', title: 'Toast 1', open: true };
    const initialState = { toasts: [toast1] };

    const updateAction = {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated Title' },
    };

    const state = reducer(initialState, updateAction);

    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].title).toBe('Updated Title');
    expect(state.toasts[0].open).toBe(true); // preserved property
  });

  test('UPDATE_TOAST ignores non-existent toast', () => {
    const toast1 = { id: '1', title: 'Toast 1', open: true };
    const initialState = { toasts: [toast1] };

    const updateAction = {
      type: 'UPDATE_TOAST',
      toast: { id: '999', title: 'Non-existent' },
    };

    const state = reducer(initialState, updateAction);

    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(toast1);
  });

  test('DISMISS_TOAST sets open to false for specific toast', () => {
    const toast1 = { id: '1', title: 'Toast 1', open: true };
    const initialState = { toasts: [toast1] };

    const dismissAction = { type: 'DISMISS_TOAST', toastId: '1' };
    const state = reducer(initialState, dismissAction);

    expect(state.toasts[0].open).toBe(false);
  });

  test('DISMISS_TOAST sets open to false for all toasts if no ID provided', () => {
    // Note: Since TOAST_LIMIT is 1, having multiple toasts is technically impossible via ADD_TOAST,
    // but we can manually construct the state to test this behavior if limit changes.
    const toast1 = { id: '1', open: true };
    const toast2 = { id: '2', open: true };
    const initialState = { toasts: [toast1, toast2] };

    const dismissAction = { type: 'DISMISS_TOAST' };
    const state = reducer(initialState, dismissAction);

    expect(state.toasts[0].open).toBe(false);
    expect(state.toasts[1].open).toBe(false);
  });

  test('REMOVE_TOAST removes specific toast', () => {
    const toast1 = { id: '1', title: 'Toast 1' };
    const toast2 = { id: '2', title: 'Toast 2' };
    const initialState = { toasts: [toast1, toast2] };

    const removeAction = { type: 'REMOVE_TOAST', toastId: '1' };
    const state = reducer(initialState, removeAction);

    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].id).toBe('2');
  });

  test('REMOVE_TOAST removes all toasts if no ID provided', () => {
    const toast1 = { id: '1', title: 'Toast 1' };
    const initialState = { toasts: [toast1] };

    const removeAction = { type: 'REMOVE_TOAST' }; // undefined toastId
    const state = reducer(initialState, removeAction);

    expect(state.toasts).toHaveLength(0);
  });
});

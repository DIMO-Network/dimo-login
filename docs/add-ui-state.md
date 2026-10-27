# 🧩 Guide: Adding a New UIState

Since navigation is not managed through a react router, we use a UI State based rendering system.

This guide covers how to introduce a new UI screen in the DIMO Webapp using the `uiState`-based rendering system. It also explains how to pass data to the new component via `componentData` instead of prop drilling.

---

## 🪟 Step 1 — Define the New UIState

Open `src/enums/state.ts` and add your new enum entry:

```tsx
export enum UiStates {
  ...
  MY_NEW_VIEW = 'MY_NEW_VIEW',
}
```

## 🧱 Step 2 — Create the Component

Create a new file in the appropriate folder inside `components/`, for example:

`components/Vehicles/MyNewVehicleComponent.tsx`

Standard React component — can be a form, flow step, confirmation, etc. Build it from the design-system primitives in `src/components/ui` so it matches the other screens:

```tsx
import { ActionBar, Button, Screen, ScreenHeader } from '../ui';
import { useT } from '../../i18n';

export const MyNewVehicleComponent = () => {
  const t = useT();
  return (
    <Screen
      actions={
        <ActionBar>
          <Button onClick={onContinue}>{t('common.continue')}</Button>
        </ActionBar>
      }
    >
      <ScreenHeader title={t('my_view.title')} />
      …
    </Screen>
  );
};
```

- `ScreenHeader` (or `DoneHeader` for a result) renders the `h1` that `AppShell` focuses when the screen opens. Use one per screen.
- `ActionBar` stays pinned at the bottom of the popup. A disabled button says why with `disabledReasonId` pointing at the bar's `hint`.
- While the screen signs or sends something, show it on the button (`loading`, `loadingLabel`) and call `setBusy(true)` from `useUIManager` so Back hides until it's done.
- Every string goes in `src/i18n/locales/en.ts` and `ja.ts` (see `i18n.md`). The locales test fails if Japanese is missing a key.

## 🧩 Step 3 — Render It in App.tsx

Add it to the `componentMap` in `App.tsx`; `AppShell` wraps it:

`[UiStates.MY_NEW_VIEW]: <MyNewVehicleComponent />,`

Then list it in `docs/flows.md`: how it's reached, what it signs and what the app is told.

## ⚙️ Step 4 — Trigger the UIState

To navigate to your new view, update the uiState via the global setter (exposed from UIManagerContext):

`setUiState(UiStates.MY_NEW_VIEW);`

You can call this after a user action, during payload parsing, or inside a flow handler.

## 📦 Optional — Passing Data with componentData

Instead of passing props deeply through multiple layers, use componentData to store and retrieve view-specific data:

An example of us doing this can be found in the Tesla Onboarding Flow

Within the ConnectTesla component, we get our device/integration ID, from the tesla oauth flow. Which we make accessible in other components through a setComponentData call

```tsx
const { setComponentData } = useUIManager();
// To set data
setComponentData({
  ...componentData,
  permissionsGranted: true,
  userDeviceID: userDeviceId,
  integrationID: TESLA_INTEGRATION_ID,
});
```

We then use it in our MintVehicleComponent

```tsx
const { componentData } = useUIManager();
const { integrationID, userDeviceID } = componentData;
```

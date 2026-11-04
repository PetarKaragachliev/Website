# Bulgarian Interface

The current analyzer and training placeholder are Bulgarian-only, per the owner's simplified redesign. The previous English/Bulgarian selector and static DOM-translation machinery were removed; old language preferences do not change the interface. Scientific names, LiftFuel branding, the requested Skinny Fat term, and original external sources retain their names.

Static HTML and body-model results use Bulgarian directly. `i18n.js`, `bg-models.js` and `bg-app.js` provide local translations for the existing language-independent nutrition model and its templates. No translation service or profile upload is used. Number display uses `bg-BG`; input parsing accepts decimal commas or dots without changing internal precision. RFM displays exactly one decimal place.

The application no longer writes `liftfuel.language`. Explicit data deletion still cleans up that old app-owned key without deleting unrelated browser data or masking a failure to remove a retained health profile. Profile version 5 is described in BODY_ASSESSMENT.md.

The former language-switch browser scenarios were replaced because that UI feature was explicitly retired, not skipped to conceal failures. Current browser checks cover Bulgarian-only content, metric calculations, clinical qualifications, two-waist correctness, storage/privacy, keyboard errors, responsive layout and separate training-page navigation. The original nutrient formula and reference tests remain. No screenshots, video or traces may be generated.

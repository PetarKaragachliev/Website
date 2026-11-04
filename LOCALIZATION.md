# English and Bulgarian

Status: Implemented for the development preview. The language control offers English and Български; initial language is English unless a valid previously chosen preference exists. Scientific names/acronyms and LiftFuel branding remain unchanged. External research pages retain their own languages; this feature translates the site's interface, not third-party publications or development documents.

## Behavior

- Translate navigation, headings, form labels/options/hints, consent notices, accessibility labels, page title/description, validation summaries/links, saved-data messages, calculation explanations, nutrient references, body assessment/RFM reasons, and meal guidance.
- Update the document's `lang` attribute. Use Bulgarian number formatting with decimal commas while leaving raw inputs, canonical enum values, formula choices, and calculation data unchanged.
- Switching language preserves entered measurements, selected goal/pace, consent, displayed results or limitations, and corrected-error state. It does not submit the form, clear a waist measurement, recalculate a different plan, or steal keyboard focus.
- English source strings remain the model output and translation keys. Bulgarian text is bundled locally; no translation provider, API key, or additional network service receives profile data.
- Clinical scope remains unchanged: FDA label references are not universal maxima, free sugar excludes intact-fruit/plain-milk sugars, RFM has its existing age/measurement-site restrictions, and no muscularity diagnosis is introduced.

## Storage and Deletion

`liftfuel.language` stores only `en` or `bg` after an explicit language choice. This functional preference is separate from health-profile remembering. Selecting a language never enables profile storage or saves eligibility. Existing record version 4 stays unchanged, with no schema migration for localization.

If storage is unavailable, switching still works for the current visit and a translated message explains that the preference could not be saved. Unknown preference values fall back to English.

Delete my saved data removes both app-owned profile and language keys while preserving unrelated browser data. The current visit can remain in the selected language; the next load defaults to English after successful deletion. If profile removal fails, that warning must not be overwritten by a separate language-removal failure. Tests cover simultaneous and language-only failures.

## Implementation

- `public/js/i18n.js`: normalized lookup, explicit template interpolation, safe English fallback, and reversible static text/attribute capture. No `innerHTML` insertion or mutation observer is used.
- `bg-static.js`: static page text and accessibility/metadata translations.
- `bg-models.js`: validation, nutrient, and body-model descriptions and caveats.
- `bg-app.js`: dynamic templates, storage messages, and application status text.
- `app.js`: localized rendering and number formatters; caches only current in-memory result/error objects to redraw without changing the profile. Input edits invalidate cached outputs as before.
- The language select sits outside the health form. Its native option values stay `en`/`bg`; translated option labels elsewhere keep their original calculation values.

Future static text needs a Bulgarian dictionary entry. Dynamic text must use `t(message, values)` with complete named values; missing template values fail explicitly. Use source-controlled translations and preserve medical distinctions rather than adding a translation-service dependency. Qualified clinical/Bulgarian content review remains part of release review, not a completed medical validation.

## Verification

Unit tests cover interpolation/whitespace, unsupported-language fallback, missing values, and nutrient message coverage. Browser tests cover both directions, results/limits/body/meals, localized errors and focus, independent preference persistence, consent/data stability, deletion failures, inaccessible storage, 320px reflow, and no translation-service requests.

The text audit checks initial source-text coverage and scans translated output for leftover English sentences, excluding documented brand/scientific names. Tests and live verification must not create screenshots, video, or traces; all tooling stays in the non-OneDrive checkout.

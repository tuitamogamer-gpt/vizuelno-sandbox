# Interface languages

Serbian Latin (`sr`) is the default, regardless of browser language. The upper-right selector also offers English (`en`) and Russian (`ru`). The `forma_language` preference cookie lasts one year and controls server-rendered copy and metadata on later visits. Switching languages updates the React context without navigation, remounting the workspace or modifying project data.

`messages.json` uses canonical Serbian application copy as keys, with complete English and Russian values. Keys normalize whitespace; strings with inserted values use numbered placeholders, for example `t("Boja {0}", { 0: index + 1 })`. Preserve the same placeholders in both translations. API errors remain canonical on the server and are translated when displayed, including known variable-bearing error templates.

Use `useI18n()` in client components and `createTranslator(await serverLocale())` in server components. Pass the locale explicitly to document exporters, date formatting, example projects and generated brief builders. PDF options include the locale and the PDF cache key includes it. Existing shared URLs do not change.

Translate application-owned copy, labels and newly inserted example/default content. Do not translate student project fields, authored prompts, teacher comments, brand names or imported work. A generated brief adds translated instructions around the original student text; subsequent language changes leave saved drafts intact.

Russian uses the bundled Noto Sans family. PDF text embeds the same Latin/Cyrillic-capable font; typography specimens use the selected project font with a Noto Sans fallback. New Russian example projects use Noto Sans.

The i18n unit tests check catalog completeness, placeholders, literal translation calls, export labels and preservation of student content. Browser tests exercise the selector, persistent language choice, edits, Playground drafts, mobile layouts and both new languages. PDF tests check translated text, metadata, navigation, Unicode and page bounds. Account tests cover localized submissions and teacher review.

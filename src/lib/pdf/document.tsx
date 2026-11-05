import React, { createContext, useContext } from "react";
import { createTranslator, htmlLanguages, type Locale } from "../i18n/core";
const PdfLocale = createContext<Locale>("sr");
function usePdfI18n() {
  const locale = useContext(PdfLocale);
  return { locale, t: createTranslator(locale) };
}
import {
  Document,
  Font,
  Image as PdfImage,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { contrastRatio, inkOn, type Project } from "../project";
import { type VisualTarget } from "../generation";
import { pdfChapters, pdfDate, type PdfOptions } from "./options";
import type { PdfAssets } from "./assets";

const ink = "#25332C",
  muted = "#68746B",
  line = "#DDE3DA",
  orange = "#BC4F2D",
  paper = "#F5F6F0";
const styles = StyleSheet.create({
  page: {
    fontFamily: "Forma PDF",
    fontSize: 10,
    color: ink,
    paddingTop: 64,
    paddingBottom: 64,
    paddingHorizontal: 46,
  },
  header: {
    position: "absolute",
    top: 26,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    color: muted,
    fontSize: 7,
    letterSpacing: 0.7,
    borderBottomWidth: 0.5,
    borderBottomColor: line,
    paddingBottom: 9,
  },
  footer: {
    position: "absolute",
    bottom: 27,
    height: 24,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: line,
    paddingTop: 9,
    color: muted,
    fontSize: 7,
  },
  kicker: {
    fontSize: 8,
    color: orange,
    fontWeight: 700,
    letterSpacing: 1.4,
    marginBottom: 9,
  },
  chapter: { fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 },
  subtitle: { fontSize: 10, color: muted, marginBottom: 28 },
  heading: { fontSize: 12, fontWeight: 700, marginTop: 17, marginBottom: 7 },
  paragraph: { fontSize: 10, marginBottom: 11, lineHeight: 1.55 },
  missing: { color: muted },
  note: { fontSize: 8, color: muted, marginTop: 7, marginBottom: 12 },
  card: {
    backgroundColor: paper,
    borderRadius: 4,
    padding: 19,
    marginVertical: 10,
  },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 7, color: muted, letterSpacing: 0.7, marginBottom: 6 },
  figure: {
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: line,
    padding: 12,
    borderRadius: 3,
  },
  caption: { fontSize: 8, color: muted, marginTop: 9 },
  cover: { backgroundColor: paper, paddingTop: 42 },
  coverTitle: { fontWeight: 700, lineHeight: 1.15, marginBottom: 15 },
  coverNumber: {
    fontSize: 58,
    fontWeight: 700,
    color: orange,
    lineHeight: 1,
    marginTop: 40,
    marginBottom: 20,
  },
  coverLogo: {
    height: 138,
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginTop: 28,
    justifyContent: "center",
  },
  coverMeta: {
    borderTopWidth: 0.5,
    borderTopColor: line,
    paddingTop: 17,
    marginTop: 27,
    flexDirection: "row",
    gap: 26,
  },
  toc: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: line,
    paddingVertical: 8,
    alignItems: "center",
  },
  tocNumber: { fontSize: 10, width: 30, color: orange, fontWeight: 700 },
  tocLink: { color: ink, textDecoration: "none", fontSize: 10 },
  swatch: {
    height: 90,
    justifyContent: "flex-end",
    padding: 9,
    marginBottom: 10,
  },
  swatchColumn: { flexGrow: 1, flexBasis: 0 },
  letter: {
    borderWidth: 0.6,
    borderColor: line,
    borderTopWidth: 5,
    padding: 24,
    marginTop: 10,
    minHeight: 365,
  },
});

function registerFonts(base: string) {
  // Fontkit retains glyph-to-Unicode mappings on a loaded face. Reusing that
  // face after a Cyrillic PDF can drop Latin glyphs in the next document.
  // The render queue makes replacing only our family safe for concurrent exports.
  delete Font.getRegisteredFonts()["Forma PDF"];
  Font.register({
    family: "Forma PDF",
    fonts: [
      { src: `${base}/NotoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/NotoSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Keep ordinary words intact. Very long URLs/identifiers must still fit the page.
  Font.registerHyphenationCallback((word) =>
    word.length > 28 ? word.match(/.{1,20}/gu) || [word] : [word],
  );
}

function Paragraph({
  children,
  fallback = "Nije uneseno.",
}: {
  children?: string;
  fallback?: string;
}) {
  const { t } = usePdfI18n();
  return (
    <Text
      style={[styles.paragraph, ...(!children?.trim() ? [styles.missing] : [])]}
      orphans={3}
      widows={3}
    >
      {children?.trim() || t(fallback)}
    </Text>
  );
}
function Heading({ children }: { children: string }) {
  return (
    <Text style={styles.heading} minPresenceAhead={34}>
      {children}
    </Text>
  );
}
function PageFrame({
  project,
  children,
  cover = false,
  bookmark,
}: {
  project: Project;
  children: React.ReactNode;
  cover?: boolean;
  bookmark?: string;
}) {
  const { t } = usePdfI18n();
  return (
    <Page
      size="A4"
      style={[styles.page, ...(cover ? [styles.cover] : [])]}
      bookmark={bookmark ? { title: bookmark, fit: true } : undefined}
      wrap
    >
      {!cover && (
        <View fixed style={styles.header}>
          <Text>{t("FORMA / VIZUELNO KOMUNICIRANJE")}</Text>
          <Text>{t("KOLOKVIJUM 01")}</Text>
        </View>
      )}
      {children}
      <View fixed style={styles.footer}>
        <Text>
          {project.name.length > 54
            ? `${project.name.slice(0, 51)}…`
            : project.name || t("Vizuelni identitet")}
        </Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}
function Chapter({
  index,
  project,
  children,
}: {
  index: number;
  project: Project;
  children: React.ReactNode;
}) {
  const { t } = usePdfI18n();
  const [id, title, description] = pdfChapters[index];
  return (
    <PageFrame
      project={project}
      bookmark={`${String(index + 1).padStart(2, "0")} / ${t(title)}`}
    >
      <View id={id} wrap={false}>
        <Text style={styles.kicker}>
          {t("VIZUELNI IDENTITET / ")}
          {String(index + 1).padStart(2, "0")}
        </Text>
        <Text style={styles.chapter}>{t(title)}</Text>
        <Text style={styles.subtitle}>{t(description)}</Text>
      </View>
      {children}
    </PageFrame>
  );
}

function Figures({
  assets,
  target,
  project,
}: {
  assets: PdfAssets;
  target: VisualTarget;
  project: Project;
}) {
  const { t } = usePdfI18n();
  return assets.visuals
    .filter(
      (v) =>
        v.target === target && v.key !== assets.logoKey,
    )
    .map((visual) => {
      // A single figure always fits inside the printable area; portrait and landscape remain uncropped.
      const height = Math.min(370, (478 * visual.height) / visual.width);
      return (
        <View key={visual.key} style={styles.figure} wrap={false}>
          <PdfImage
            src={visual.image}
            style={{ width: "100%", height, objectFit: "contain" }}
          />
          <Text style={styles.caption}>
            {visual.caption}
            {target === "logo" && project.logoImage
              ? t(" · Istraživanje znaka")
              : ""}
          </Text>
        </View>
      );
    });
}

function Cover({
  project: p,
  assets,
  options: o,
}: {
  project: Project;
  assets: PdfAssets;
  options: PdfOptions;
}) {
  const { t, locale } = usePdfI18n();
  const compact =
    p.name.length + p.slogan.length + o.author.length + o.group.length > 300;
  return (
    <PageFrame project={p} cover>
      <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
        {t("FORMA / STUDENTSKI STUDIO")}
      </Text>
      <Text
        style={[
          styles.coverNumber,
          ...(compact
            ? [{ fontSize: 40, marginTop: 24, marginBottom: 10 }]
            : []),
        ]}
      >
        01
      </Text>
      <Text style={styles.kicker}>
        {t("VIZUELNO KOMUNICIRANJE · PRVI KOLOKVIJUM")}
      </Text>
      <Text
        style={[
          styles.coverTitle,
          {
            fontSize: compact
              ? 18
              : p.name.length > 90
                ? 22
                : p.name.length > 45
                  ? 28
                  : 40,
          },
        ]}
      >
        {p.name.trim() || t("Vizuelni identitet")}
      </Text>
      <Text style={{ fontSize: 12, color: muted }}>
        {t("Knjiga vizuelnog identiteta")}
      </Text>
      {!!p.slogan.trim() && (
        <Text style={{ fontSize: 13, marginTop: 12 }}>{p.slogan}</Text>
      )}
      <View
        style={[
          styles.coverLogo,
          ...(compact ? [{ height: 90, marginTop: 18 }] : []),
        ]}
        wrap={false}
      >
        {!!assets.logo && <PdfImage
          src={assets.logo}
          style={{
            width: "100%",
            height: compact ? 50 : 98,
            objectFit: "contain",
          }}
        />}
      </View>
      <View style={{ flexDirection: "row", height: 23 }}>
        {p.colors.map((color, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: color.hex }} />
        ))}
      </View>
      <View
        style={[
          styles.coverMeta,
          ...(compact ? [{ marginTop: 18, paddingTop: 12 }] : []),
        ]}
        wrap={false}
      >
        <View style={{ flex: 2 }}>
          <Text style={styles.label}>{t("AUTOR / AUTORKA")}</Text>
          <Text style={{ fontWeight: 700, fontSize: compact ? 10 : 12 }}>
            {o.author.trim() || t("Autor nije unesen")}
          </Text>
          {!!o.studentNumber.trim() && (
            <Text style={{ marginTop: 6 }}>
              {t("Broj indeksa: ")}
              {o.studentNumber.trim()}
            </Text>
          )}
          {!!o.group.trim() && (
            <Text style={{ marginTop: 4 }}>{o.group.trim()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t("DATUM DOKUMENTA")}</Text>
          <Text>{pdfDate(o.date, locale)}</Text>
          <Text style={[styles.label, { marginTop: 13 }]}>
            {t("VRSTA PROJEKTA")}
          </Text>
          <Text>
            {p.kind === "redesign"
              ? t("Redizajn identiteta")
              : t("Novi identitet")}
          </Text>
        </View>
      </View>
      {o.submission && (
        <Text style={styles.note}>
          {t("Sačuvana predaja · verzija ")}
          {o.submission.version}
          {t(" · predato ")}
          {pdfDate(o.submission.createdAt, locale)}
        </Text>
      )}
    </PageFrame>
  );
}

export function IdentityPdf({
  project: p,
  options: o,
  assets,
}: {
  project: Project;
  options: PdfOptions;
  assets: PdfAssets;
}) {
  const locale = o.locale || "sr",
    t = createTranslator(locale);
  const primary = p.colors[0].hex,
    secondary = p.colors[1].hex;
  const contrast = contrastRatio(primary, secondary);
  return (
    <PdfLocale.Provider value={locale}>
      <Document
        title={`${p.name || t("Vizuelni identitet")} — ${t("Kolokvijum 01")}`}
        author={o.author}
        subject={t("Vizuelno komuniciranje · Knjiga vizuelnog identiteta")}
        creator={t("Forma — studentski studio")}
        language={htmlLanguages[locale]}
        pageMode="useOutlines"
      >
        <Cover project={p} assets={assets} options={o} />
        <Chapter index={0} project={p}>
          <Heading>{t("Ideja projekta")}</Heading>
          <Paragraph>{p.description}</Paragraph>
          <Heading>{t("Ciljna publika")}</Heading>
          <Paragraph>{p.audience}</Paragraph>
          <Figures assets={assets} target="moodboard" project={p} />
          <View style={{ marginTop: 16 }} wrap={false}>
            <Text style={styles.kicker}>{t("SADRŽAJ DOKUMENTA")}</Text>
            {pdfChapters.map(([id, title], index) => (
              <View style={styles.toc} key={id}>
                <Text style={styles.tocNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Link style={styles.tocLink} src={`#${id}`}>
                  {t(title)}
                </Link>
              </View>
            ))}
          </View>
        </Chapter>
        <Chapter index={1} project={p}>
          <Heading>{t("Vizija")}</Heading>
          <Paragraph>{p.vision}</Paragraph>
          <Heading>{t("Misija")}</Heading>
          <Paragraph>{p.mission}</Paragraph>
          <Heading>{t("Strategija")}</Heading>
          <Paragraph>{p.strategy}</Paragraph>
          <Heading>{t("Ciljevi")}</Heading>
          {p.goals.some((g) => g.trim()) ? (
            p.goals
              .filter((g) => g.trim())
              .map((goal, i) => (
                <View
                  style={[styles.row, { marginBottom: 12 }]}
                  key={i}
                  wrap={false}
                >
                  <Text style={{ width: 22, color: orange, fontWeight: 700 }}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text style={{ flex: 1 }}>{goal}</Text>
                </View>
              ))
          ) : (
            <Paragraph fallback={t("Ciljevi nisu uneseni.")} />
          )}
        </Chapter>
        <Chapter index={2} project={p}>
          <View style={styles.row} wrap={false}>
            {p.colors.map((color, i) => (
              <View key={i} style={styles.swatchColumn}>
                <View style={[styles.swatch, { backgroundColor: color.hex }]}>
                  <Text style={{ color: inkOn(color.hex), fontSize: 20 }}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={{ fontWeight: 700, fontSize: 9, marginBottom: 4 }}>
                  {color.name || t("Boja {0}", { 0: i + 1 })}
                </Text>
                <Text style={{ fontSize: 9 }}>{color.hex.toUpperCase()}</Text>
                <Text style={{ color: muted, fontSize: 7 }}>
                  RGB{" "}
                  {color.hex
                    .slice(1)
                    .match(/.{2}/g)!
                    .map((v) => parseInt(v, 16))
                    .join(" / ")}
                </Text>
              </View>
            ))}
          </View>
          <Heading>{t("Zašto ove boje?")}</Heading>
          <Paragraph>{p.colorReason}</Paragraph>
          <View
            style={[styles.card, { backgroundColor: secondary }]}
            wrap={false}
          >
            <Text style={{ color: primary, fontSize: 28, fontWeight: 700 }}>
              {t("Aa / Kontrast")}
            </Text>
            <Text style={{ color: inkOn(secondary), fontSize: 9 }}>
              {primary.toUpperCase()}
              {t(" na ")}
              {secondary.toUpperCase()}
              {t(" · odnos ")}
              {contrast.toFixed(2)} : 1
            </Text>
          </View>
          <Text style={styles.note}>
            {contrast >= 4.5
              ? t(
                  "Ova kombinacija zadovoljava WCAG AA prag od 4,5 : 1 za običan tekst.",
                )
              : contrast >= 3
                ? t(
                    "Ova kombinacija zadovoljava WCAG AA prag za veliki tekst, ali ne i prag od 4,5 : 1 za običan tekst.",
                  )
                : t(
                    "Ova kombinacija ne zadovoljava WCAG AA prag za tekst. Za čitanje izaberi kontrastniju kombinaciju.",
                  )}
            {t(" Odnos se odnosi samo na prikazane dvije boje.")}
          </Text>
          <Figures assets={assets} target="palette" project={p} />
        </Chapter>
        <Chapter index={3} project={p}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: "#FFFFFF",
                borderWidth: 0.5,
                borderColor: line,
                paddingVertical: 35,
              },
            ]}
            wrap={false}
          >
            {!!assets.logo && <PdfImage
              src={assets.logo}
              style={{ width: "100%", height: 180, objectFit: "contain" }}
            />}
          </View>
          <Text style={styles.note}>{assets.logo ? t("Odabrani logotip projekta") : t("Logotip nije označen za PDF.")}</Text>
          <Heading>{t("Značenje i obrazloženje")}</Heading>
          <Paragraph>{p.logoReason}</Paragraph>
          <Figures assets={assets} target="logo" project={p} />
        </Chapter>
        <Chapter index={4} project={p}>
          <View style={styles.card} wrap={false}>
            <Text style={styles.label}>
              {t("NASLOVI / ")}
              {p.headingFont}
            </Text>
            <PdfImage
              src={assets.headingSample}
              style={{ width: "100%", height: 90, objectFit: "contain" }}
            />
          </View>
          <View style={styles.card} wrap={false}>
            <Text style={styles.label}>
              {t("OSNOVNI TEKST / ")}
              {p.bodyFont}
            </Text>
            <PdfImage
              src={assets.bodySample}
              style={{ width: "100%", height: 65, objectFit: "contain" }}
            />
          </View>
          <Heading>{t("Izbor i odnos fontova")}</Heading>
          <Paragraph>{p.typeReason}</Paragraph>
          <Figures assets={assets} target="typography" project={p} />
        </Chapter>
        <Chapter index={5} project={p}>
          <View
            style={[styles.letter, { borderTopColor: primary }]}
            wrap={false}
          >
            {!!assets.logo && <PdfImage
              src={assets.logo}
              style={{
                width: 170,
                height: 65,
                objectFit: "contain",
                objectPosition: "left",
              }}
            />}
            <View style={{ marginTop: 32, marginBottom: 35, fontSize: 9 }}>
              <Text style={{ marginBottom: 15 }}>{t("Poštovani,")}</Text>
              <Text style={{ marginBottom: 15 }}>
                {t(
                  "Ovaj primjer prikazuje raspored logotipa, teksta i kontakta na poslovnom memorandumu.",
                )}
              </Text>
              <Text>{t("Srdačno,")}</Text>
              <Text style={{ fontWeight: 700 }}>
                {p.name || t("Naziv projekta")}
              </Text>
            </View>
            <View
              style={{
                borderTopWidth: 0.5,
                borderTopColor: line,
                paddingTop: 12,
                fontSize: 8,
                marginTop: "auto",
              }}
            >
              {[p.contact, p.address, p.website]
                .filter((v) => v.trim())
                .map((value, i) => (
                  <Text key={i}>{value}</Text>
                ))}
              {![p.contact, p.address, p.website].some((v) => v.trim()) && (
                <Text style={{ color: muted }}>
                  {t("Kontakt podaci nisu uneseni.")}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.note}>
            {t("Primjer rasporeda memoranduma izveden iz elemenata projekta.")}
          </Text>
          <Heading>{t("Obrazloženje primjene")}</Heading>
          <Paragraph>{p.applicationNote}</Paragraph>
          <Figures assets={assets} target="letterhead" project={p} />
          <Figures assets={assets} target="social" project={p} />
        </Chapter>
        <Chapter index={6} project={p}>
          <Heading>{t("Izvori i vlastite izmjene")}</Heading>
          <Paragraph fallback={t("Izvori nisu uneseni.")}>
            {p.sources}
          </Paragraph>
          <Heading>{t("Upotreba AI alata")}</Heading>
          <Paragraph fallback={t("Upotreba AI alata nije opisana.")}>
            {p.aiDisclosure}
          </Paragraph>
          {!!assets.visuals.length && (
            <View style={styles.card}>
              <Text style={styles.label}>
                {t("AI VIZUALI U OVOM DOKUMENTU")}
              </Text>
              {assets.visuals.map((v) => (
                <Text key={v.key} style={{ fontSize: 8, marginBottom: 6 }}>
                  {v.caption}
                </Text>
              ))}
              <Text style={styles.note}>
                {t(
                  "Vizuali su označeni kao AI skice. Autorske dorade i odluke opisane su u obrazloženjima projekta.",
                )}
              </Text>
            </View>
          )}
          <Heading>{t("Osvrt na rad")}</Heading>
          <Paragraph fallback={t("Osvrt nije unesen.")}>
            {p.reflection}
          </Paragraph>
          <Text
            style={[
              styles.note,
              {
                borderTopWidth: 0.5,
                borderTopColor: line,
                paddingTop: 15,
                marginTop: 24,
              },
            ]}
          >
            {t("Dokument pripremljen u studiju Forma · ")}
            {pdfDate(o.date, locale)}
            {t(" PDF je izvoz ")}
            {o.submission
              ? t("sačuvane predaje, verzija {0}", { 0: o.submission.version })
              : t("trenutnog projekta")}
            {t("; njegovo preuzimanje ne predstavlja predaju rada nastavniku.")}
          </Text>
        </Chapter>
        {o.includePrompts && assets.visuals.length > 0 && (
          <PageFrame project={p} bookmark={t("Prilog / Promptovi")}>
            <View wrap={false}>
              <Text style={styles.kicker}>{t("PRILOG / AI PROCES")}</Text>
              <Text style={styles.chapter}>{t("Promptovi")}</Text>
              <Text style={styles.subtitle}>
                {t("Opisi korišteni za vizuale uključene u dokument.")}
              </Text>
            </View>
            {assets.visuals.map((v, i) => (
              <View key={v.key}>
                <Heading>{`${String(i + 1).padStart(2, "0")} / ${v.caption}`}</Heading>
                <Paragraph fallback={t("Prompt nije sačuvan.")}>
                  {v.prompt}
                </Paragraph>
              </View>
            ))}
          </PageFrame>
        )}
      </Document>
    </PdfLocale.Provider>
  );
}

let renderQueue: Promise<void> = Promise.resolve();
export function renderIdentityPdf(
  project: Project,
  options: PdfOptions,
  assets: PdfAssets,
  fonts = "/fonts/pdf",
) {
  // The renderer shares its font store. Closing a dialog and immediately starting
  // another export must not clear fonts while an earlier document is still using them.
  const task = renderQueue.then(async () => {
    registerFonts(fonts);
    try {
      return await pdf(
        <IdentityPdf project={project} options={options} assets={assets} />,
      ).toBlob();
    } catch (error) {
      // FontSource caches rejected loads too; discard them so reconnect + retry works.
      // Preserve the renderer's built-in fallback fonts while replacing our sources.
      delete Font.getRegisteredFonts()["Forma PDF"];
      throw error;
    }
  });
  renderQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

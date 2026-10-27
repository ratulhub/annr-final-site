import { createFileRoute } from "@tanstack/react-router";
import { setSite } from "../admin/store";
import { Card } from "../admin/ui";
import { FONT_OPTIONS, RADIUS, SCALE, WIDTHS } from "../admin/site/registry";
import { siteDefaults } from "../admin/site/defaults";
import { Big, Chk, ColorF, DevicePreview, F, Obj, Pick, UrlF } from "../admin/site/fields";

export const Route = createFileRoute("/admin/theme")({ component: Theme });

function Theme() {
  return (
    <>
      <div className="adm-top"><h1>Appearance & design</h1>
        <button className="adm-btn ghost" onClick={() => confirm("Reset all design settings to the original look?") && setSite("design", siteDefaults().design)}>Reset to original</button></div>
      <p className="adm-hint">Empty values keep the original AnnR design. Choices are limited to safe values so the layout can't break.</p>
      <Obj k="design">{(d, set) => <>
        <Card title="Colours"><div className="adm-grid">
          <ColorF label="Page background" value={d.background} onChange={(background) => set({ background })} />
          <ColorF label="Text" value={d.text} onChange={(text) => set({ text })} />
          <ColorF label="Accent (product labels)" value={d.accent} onChange={(accent) => set({ accent })} />
          <ColorF label="Header background" value={d.headerBg} onChange={(headerBg) => set({ headerBg })} />
          <ColorF label="Header text" value={d.headerText} onChange={(headerText) => set({ headerText })} />
          <ColorF label="Footer background" value={d.footerBg} onChange={(footerBg) => set({ footerBg })} />
          <ColorF label="Footer text" value={d.footerText} onChange={(footerText) => set({ footerText })} />
          <Pick label="Mode" value={d.mode} options={["light", "dark"]} onChange={(mode) => set({ mode: mode as "light" | "dark" })} />
        </div></Card>
        <Card title="Typography"><div className="adm-grid">
          <Pick label="Heading font" value={d.headingFont} options={FONT_OPTIONS} onChange={(headingFont) => set({ headingFont })} />
          <Pick label="Body font" value={d.bodyFont} options={FONT_OPTIONS} onChange={(bodyFont) => set({ bodyFont })} />
          <Pick label="Text size" value={d.fontScale} options={SCALE} onChange={(fontScale) => set({ fontScale })} />
        </div></Card>
        <Card title="Buttons, forms & layout"><div className="adm-grid">
          <ColorF label="Button background" value={d.buttonBg} onChange={(buttonBg) => set({ buttonBg })} />
          <ColorF label="Button text" value={d.buttonText} onChange={(buttonText) => set({ buttonText })} />
          <Pick label="Button corners" value={d.buttonRadius} options={RADIUS} onChange={(buttonRadius) => set({ buttonRadius })} />
          <Pick label="Input corners" value={d.inputRadius} options={RADIUS} onChange={(inputRadius) => set({ inputRadius })} />
          <Pick label="Max page width" value={d.containerWidth} options={WIDTHS} onChange={(containerWidth) => set({ containerWidth })} />
        </div></Card>
      </>}</Obj>
      <Card title="Logo & icon"><Obj k="general">{(g, set) => <div className="adm-grid">
        <UrlF label="Logo image (empty = original)" value={g.logoUrl} onChange={(logoUrl) => set({ logoUrl })} hint="Pick a link from the Media library" />
        <F label="Logo alt text" value={g.logoAlt} onChange={(logoAlt) => set({ logoAlt })} />
        <UrlF label="Secondary logo" value={g.secondaryLogo} onChange={(secondaryLogo) => set({ secondaryLogo })} />
        <UrlF label="Favicon" value={g.favicon} onChange={(favicon) => set({ favicon })} />
      </div>}</Obj></Card>
      <Card title="Store features"><Obj k="technical">{(t, set) => <div className="adm-grid">
        <Chk label="Page transition animation" value={t.pageTransition} onChange={(pageTransition) => set({ pageTransition })} />
        <Chk label="Product labels (e.g. sold out)" value={t.productLabels} onChange={(productLabels) => set({ productLabels })} />
        <Big label="Custom CSS (advanced)" value={t.customCss} onChange={(customCss) => set({ customCss })} />
      </div>}</Obj></Card>
      <Card title="Preview"><DevicePreview url="/home.html" /></Card>
    </>
  );
}

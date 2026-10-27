export const REPORTS: { id: string; title: string; purpose: string; standard: boolean }[] = [
  { id: "overview", title: "Analytics overview", purpose: "The most important numbers at a glance.", standard: true },
  { id: "visitors", title: "Visitors & sessions", purpose: "Who visits: visitors (browsers), sessions (visits), devices and countries.", standard: true },
  { id: "acquisition", title: "Traffic acquisition", purpose: "Where visits come from: channels, campaigns and referring sites.", standard: true },
  { id: "content", title: "Engagement & content", purpose: "Which pages are viewed and how people interact with them.", standard: true },
  { id: "events", title: "Events & interactions", purpose: "Every tracked action and the event schema.", standard: true },
  { id: "funnels", title: "Conversion funnels", purpose: "Build step-by-step goals and see where people drop off.", standard: false },
  { id: "performance", title: "Website performance", purpose: "Speed and stability (Core Web Vitals). Separate from visitor numbers.", standard: true },
  { id: "errors", title: "Errors & site health", purpose: "Script errors and failed requests by page.", standard: true },
  { id: "seo", title: "SEO performance", purpose: "Search setup checks from your real data; search traffic once connected.", standard: false },
  { id: "ecommerce", title: "Ecommerce & revenue", purpose: "Orders, revenue and products.", standard: true },
  { id: "reports", title: "Reports & export", purpose: "Choose summary cards, save filters and export data.", standard: false },
  { id: "settings", title: "Analytics settings", purpose: "Data source, providers and local event data.", standard: false },
];

import { Injectable } from '@nestjs/common';

type RegionFilter = 'TR' | 'DE' | 'EU' | 'ALL';
type ResearchStatus = 'Yeni' | 'Inceleniyor' | 'Numune Yapilacak' | 'Uretim Testi' | 'Onaylandi' | 'Reddedildi' | 'Urune Donusturuldu';

type ProductSignal = {
  id: string;
  imageUrl: string | null;
  productName: string;
  brand: string | null;
  seller: string | null;
  source: string;
  country: string;
  currentPrice: number | null;
  oldPrice: number | null;
  currency: 'TRY' | 'EUR' | 'USD';
  rating: number | null;
  reviewCount: number;
  bestseller: boolean;
  heightCm: number | null;
  features: string[];
  url: string | null;
  checkedAt: string;
  sourceConnected: boolean;
};

type ProviderResult = {
  providerId: string;
  providerName: string;
  connected: boolean;
  trustScore: number;
  signal: string;
  products: ProductSignal[];
  error?: string;
};

type DeepResearchRequest = {
  query?: string;
  country?: RegionFilter;
  sources?: string[];
  minPrice?: number;
  maxPrice?: number;
  minHeight?: number;
  maxHeight?: number;
  productType?: string;
  potted?: boolean;
  indoor?: boolean;
  outdoor?: boolean;
  uvResistant?: boolean;
  onlyBestsellers?: boolean;
  onlyHighRated?: boolean;
};

type DeepResearchResult = {
  id: string;
  query: string;
  queryVariations: string[];
  createdAt: string;
  filters: Required<Omit<DeepResearchRequest, 'query' | 'sources'>> & { sources: string[] };
  providers: ProviderResult[];
  products: ProductSignal[];
  ourProducts: ProductSignal[];
  excludedOwnMatches: number;
  opportunityScore: {
    total: number;
    demand: string;
    competition: string;
    priceOpportunity: string;
    visualStandard: string;
    seoCompetition: string;
    turkeyOpportunity: string;
    producibility: string;
    explanation: string;
  };
  priceAnalysis: {
    min: number | null;
    max: number | null;
    average: number | null;
    median: number | null;
    byCountry: Array<{ country: string; average: number | null; currency: string; count: number }>;
  };
  seoAnalysis: {
    words: Array<{ word: string; percent: number }>;
    suggestedTitle: string;
  };
  reviewAnalysis: Record<string, string[]>;
  questionAnalysis: Record<string, string[]>;
  visualAnalysis: Record<string, string | number | boolean>;
  producibility: {
    score: number;
    bodyAvailable: boolean;
    leafAvailable: boolean;
    potAvailable: boolean;
    difficulty: string;
  };
};

type SavedResearch = {
  id: string;
  query: string;
  queryVariations: string[];
  createdAt: string;
  sources: string[];
  resultCount: number;
  opportunityScore: number;
  userNote: string;
};

type ExclusionSettings = {
  ownBrands: string[];
  negativeKeywords: string[];
};

const PROVIDERS = [
  { id: 'trendyol', name: 'Trendyol', country: 'TR', region: 'TR', connected: false, trustScore: 72, signal: 'Arama sonucu ve pazar yeri siralamasi' },
  { id: 'hepsiburada', name: 'Hepsiburada', country: 'TR', region: 'TR', connected: false, trustScore: 64, signal: 'Arama sonucu' },
  { id: 'n11', name: 'N11', country: 'TR', region: 'TR', connected: false, trustScore: 58, signal: 'Arama sonucu' },
  { id: 'amazon-tr', name: 'Amazon TR', country: 'TR', region: 'TR', connected: false, trustScore: 68, signal: 'Arama sonucu' },
  { id: 'amazon-de', name: 'Amazon DE', country: 'DE', region: 'DE', connected: false, trustScore: 74, signal: 'Arama sonucu ve bestseller sinyali' },
  { id: 'kaufland', name: 'Kaufland', country: 'DE', region: 'DE', connected: false, trustScore: 62, signal: 'Arama sonucu' },
  { id: 'otto', name: 'OTTO', country: 'DE', region: 'DE', connected: false, trustScore: 62, signal: 'Arama sonucu' },
  { id: 'wayfair', name: 'Wayfair', country: 'EU', region: 'EU', connected: false, trustScore: 70, signal: 'Kategori ve arama sinyali' },
  { id: 'manomano', name: 'ManoMano', country: 'EU', region: 'EU', connected: false, trustScore: 60, signal: 'Arama sonucu' },
  { id: 'etsy', name: 'Etsy', country: 'EU', region: 'EU', connected: false, trustScore: 57, signal: 'Marketplace arama sinyali' },
];

@Injectable()
export class DeepMarketResearchService {
  private readonly savedResearches: SavedResearch[] = [];
  private readonly trackedCompetitors: ProductSignal[] = [];
  private readonly opportunities: Array<SavedResearch & { status: ResearchStatus }> = [];
  private settings: ExclusionSettings = {
    ownBrands: ['Erhan Flowers', 'ERHAN FLOWERS', 'erhanflowers', 'erhanflowers.com', 'Flora Yapay Cicek', 'Flora Yapay Çiçek', 'florayapaycicek.com'],
    negativeKeywords: ['canli bitki', 'canlı bitki', 'gercek bitki', 'gerçek bitki', 'fide', 'tohum', 'bakim gubresi', 'bakım gübresi'],
  };

  listProviders() {
    return PROVIDERS;
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(body: Partial<ExclusionSettings>) {
    this.settings = {
      ownBrands: this.cleanList(body.ownBrands, this.settings.ownBrands),
      negativeKeywords: this.cleanList(body.negativeKeywords, this.settings.negativeKeywords),
    };
    return this.settings;
  }

  runDeepResearch(body: DeepResearchRequest): DeepResearchResult {
    const query = String(body.query ?? '').trim();
    if (!query) throw new Error('Urun adi veya anahtar kelime zorunludur.');

    const queryVariations = this.expandQuery(query);
    const selectedProviders = this.selectProviders(body.country ?? 'ALL', body.sources ?? []);
    const providers = selectedProviders.map((provider) => ({
      providerId: provider.id,
      providerName: provider.name,
      connected: provider.connected,
      trustScore: provider.trustScore,
      signal: provider.signal,
      products: [] as ProductSignal[],
      error: provider.connected ? undefined : 'Veri kaynagi henuz bagli degil',
    }));
    const allProducts = providers.flatMap((provider) => provider.products).filter((product) => !this.hasNegativeKeyword(product));
    const ourProducts = allProducts.filter((product) => this.isOwnProduct(product));
    const rivalProducts = allProducts.filter((product) => !this.isOwnProduct(product));
    const filteredProducts = this.applyFilters(rivalProducts, body);

    return {
      id: this.id('research'),
      query,
      queryVariations,
      createdAt: new Date().toISOString(),
      filters: {
        country: body.country ?? 'ALL',
        sources: selectedProviders.map((provider) => provider.id),
        minPrice: body.minPrice ?? 0,
        maxPrice: body.maxPrice ?? 0,
        minHeight: body.minHeight ?? 0,
        maxHeight: body.maxHeight ?? 0,
        productType: body.productType ?? '',
        potted: body.potted ?? false,
        indoor: body.indoor ?? false,
        outdoor: body.outdoor ?? false,
        uvResistant: body.uvResistant ?? false,
        onlyBestsellers: body.onlyBestsellers ?? false,
        onlyHighRated: body.onlyHighRated ?? false,
      },
      providers,
      products: filteredProducts,
      ourProducts,
      excludedOwnMatches: ourProducts.length,
      opportunityScore: this.score(filteredProducts, selectedProviders),
      priceAnalysis: this.priceAnalysis(filteredProducts),
      seoAnalysis: this.seoAnalysis(query, filteredProducts),
      reviewAnalysis: this.emptyGroupedAnalysis(),
      questionAnalysis: this.emptyGroupedAnalysis(),
      visualAnalysis: {
        whiteBackgroundUsagePercent: 0,
        lifestyleImageUsagePercent: 0,
        measurementImageUsagePercent: 0,
        videoAvailablePercent: 0,
        status: 'Veri kaynagi baglandiginda otomatik hesaplanacak',
      },
      producibility: {
        score: 92,
        bodyAvailable: true,
        leafAvailable: true,
        potAvailable: true,
        difficulty: 'Dusuk',
      },
    };
  }

  saveResearch(body: { result?: DeepResearchResult; note?: string }) {
    if (!body.result) throw new Error('Kaydedilecek arastirma sonucu zorunludur.');
    const row: SavedResearch = {
      id: body.result.id,
      query: body.result.query,
      queryVariations: body.result.queryVariations,
      createdAt: body.result.createdAt,
      sources: body.result.filters.sources,
      resultCount: body.result.products.length,
      opportunityScore: body.result.opportunityScore.total,
      userNote: String(body.note ?? '').trim(),
    };
    this.savedResearches.unshift(row);
    return row;
  }

  listSavedResearches() {
    return this.savedResearches;
  }

  opportunityRadar() {
    const connectedCount = PROVIDERS.filter((provider) => provider.connected).length;
    return {
      generatedAt: new Date().toISOString(),
      dataSourcesConnected: connectedCount,
      status: connectedCount ? 'ready' : 'no-connected-provider',
      message: connectedCount ? 'Global firsat radari hazir.' : 'Veri kaynagi henuz bagli degil',
      opportunities: this.opportunities,
      sampleLogic: [
        'Almanya talebi yuksek',
        'Turkiye rekabeti dusuk',
        'Erhan Flowers uretilebilirligi yuksek',
        'Maliyet ve marj araligi uygun',
      ],
    };
  }

  saveOpportunity(body: { research?: SavedResearch; status?: ResearchStatus; note?: string }) {
    if (!body.research) throw new Error('Urun firsati kaydi icin arastirma bilgisi zorunludur.');
    const row = { ...body.research, userNote: body.note ?? body.research.userNote, status: body.status ?? 'Yeni' };
    this.opportunities.unshift(row);
    return row;
  }

  addCompetitor(product: ProductSignal) {
    this.trackedCompetitors.unshift(product);
    return { ok: true, total: this.trackedCompetitors.length };
  }

  listCompetitors() {
    return this.trackedCompetitors;
  }

  private selectProviders(country: RegionFilter, sources: string[]) {
    return PROVIDERS.filter((provider) => {
      const countryMatches = country === 'ALL' || provider.region === country || (country === 'EU' && ['EU', 'DE'].includes(provider.region));
      const sourceMatches = !sources.length || sources.includes(provider.id);
      return countryMatches && sourceMatches;
    });
  }

  private expandQuery(query: string) {
    const clean = query.trim();
    const withoutHeight = clean.replace(/\b\d{2,3}\s*cm\b/gi, '').replace(/\s+/g, ' ').trim();
    const height = clean.match(/\b\d{2,3}\s*cm\b/i)?.[0] ?? '';
    const variations = [
      clean,
      withoutHeight,
      withoutHeight.replace(/^yapay\s+/i, '').trim() ? `${withoutHeight.replace(/^yapay\s+/i, '').trim()} yapay` : '',
      `dekoratif ${withoutHeight}`.trim(),
      `saksili ${withoutHeight}`.trim(),
      `olive artificial tree ${height}`.trim(),
      `artificial olive tree ${height}`.trim(),
      `kunstlicher olivenbaum ${height}`.trim(),
    ];
    return [...new Set(variations.filter(Boolean))];
  }

  private isOwnProduct(product: ProductSignal) {
    const haystack = [product.brand, product.seller, product.productName, product.url].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
    return this.settings.ownBrands.some((brand) => haystack.includes(brand.toLocaleLowerCase('tr-TR')));
  }

  private hasNegativeKeyword(product: ProductSignal) {
    const haystack = [product.productName, product.features.join(' ')].join(' ').toLocaleLowerCase('tr-TR');
    return this.settings.negativeKeywords.some((word) => haystack.includes(word.toLocaleLowerCase('tr-TR')));
  }

  private applyFilters(products: ProductSignal[], body: DeepResearchRequest) {
    return products.filter((product) => {
      if (body.minPrice && (product.currentPrice ?? 0) < body.minPrice) return false;
      if (body.maxPrice && (product.currentPrice ?? 0) > body.maxPrice) return false;
      if (body.minHeight && (product.heightCm ?? 0) < body.minHeight) return false;
      if (body.maxHeight && (product.heightCm ?? 0) > body.maxHeight) return false;
      if (body.onlyBestsellers && !product.bestseller) return false;
      if (body.onlyHighRated && (product.rating ?? 0) < 4.5) return false;
      return true;
    });
  }

  private score(products: ProductSignal[], providers: typeof PROVIDERS) {
    const connectedProviders = providers.filter((provider) => provider.connected).length;
    const total = connectedProviders ? Math.min(100, 55 + products.length * 3 + connectedProviders * 6) : 0;
    return {
      total,
      demand: connectedProviders ? 'Olculuyor' : 'Veri yok',
      competition: connectedProviders ? 'Olculuyor' : 'Veri yok',
      priceOpportunity: connectedProviders ? 'Olculuyor' : 'Veri yok',
      visualStandard: connectedProviders ? 'Olculuyor' : 'Veri yok',
      seoCompetition: connectedProviders ? 'Olculuyor' : 'Veri yok',
      turkeyOpportunity: connectedProviders ? 'Olculuyor' : 'Veri yok',
      producibility: 'Yuksek',
      explanation: connectedProviders
        ? 'Bagli kaynaklardan gelen rakip, fiyat ve talep sinyalleri agirliklandirildi.'
        : 'Henuz bagli veri kaynagi olmadigi icin firsat puani hesaplanmadi; provider mimarisi hazir.',
    };
  }

  private priceAnalysis(products: ProductSignal[]) {
    const prices = products.map((product) => product.currentPrice).filter((price): price is number => typeof price === 'number' && price > 0).sort((a, b) => a - b);
    const average = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null;
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
    return {
      min: prices[0] ?? null,
      max: prices[prices.length - 1] ?? null,
      average: average == null ? null : Math.round(average * 100) / 100,
      median,
      byCountry: [] as Array<{ country: string; average: number | null; currency: string; count: number }>,
    };
  }

  private seoAnalysis(query: string, products: ProductSignal[]) {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      product.productName.split(/\s+/).forEach((word) => {
        const clean = word.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');
        if (clean.length > 2) counts.set(clean, (counts.get(clean) ?? 0) + 1);
      });
    });
    const total = products.length || 1;
    const words = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word, count]) => ({ word, percent: Math.round((count / total) * 100) }));
    return { words, suggestedTitle: query };
  }

  private emptyGroupedAnalysis() {
    return {
      praises: [] as string[],
      complaints: [] as string[],
      quality: [] as string[],
      size: [] as string[],
      packaging: [] as string[],
      realism: [] as string[],
      price: [] as string[],
    };
  }

  private cleanList(next: string[] | undefined, fallback: string[]) {
    if (!Array.isArray(next)) return fallback;
    return [...new Set(next.map((item) => String(item).trim()).filter(Boolean))];
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

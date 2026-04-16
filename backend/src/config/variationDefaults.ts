/**
 * Category-based Default Variations Configuration
 * Defines which variations to show by default for each jewelry category
 */

export interface VariationConfig {
  name: string;
  label: string;
  type: 'select' | 'size' | 'color' | 'radio';
  required: boolean;
  options: string[];
}

export interface CategoryVariationMap {
  [category: string]: VariationConfig[];
}

export const DEFAULT_VARIATIONS: CategoryVariationMap = {
  // Rings - yüzük
  rings: [
    {
      name: 'size',
      label: 'Ring Size',
      type: 'select',
      required: true,
      options: ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17']
    },
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],
  yüzük: [
    {
      name: 'size',
      label: 'Yüzük Ölçüsü',
      type: 'select',
      required: true,
      options: ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17']
    },
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],

  // Necklaces - kolyeler
  necklaces: [
    {
      name: 'length',
      label: 'Chain Length',
      type: 'select',
      required: true,
      options: ['40cm', '45cm', '50cm', '55cm', '60cm', '70cm', '80cm']
    },
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],
  kolye: [
    {
      name: 'length',
      label: 'Zincil Uzunluğu',
      type: 'select',
      required: true,
      options: ['40cm', '45cm', '50cm', '55cm', '60cm', '70cm', '80cm']
    },
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],

  // Bracelets - bilezik
  bracelets: [
    {
      name: 'size',
      label: 'Bracelet Size',
      type: 'select',
      required: false,
      options: ['Small (16cm)', 'Medium (17cm)', 'Large (18cm)', 'XL (19cm)', 'XXL (20cm)']
    },
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],
  bilezik: [
    {
      name: 'size',
      label: 'Bilezik Ölçüsü',
      type: 'select',
      required: false,
      options: ['Küçük (16cm)', 'Orta (17cm)', 'Büyük (18cm)', 'XL (19cm)', 'XXL (20cm)']
    },
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],

  // Earrings - küpe
  earrings: [
    {
      name: 'closure',
      label: 'Earring Type',
      type: 'select',
      required: true,
      options: ['Stud', 'Drop', 'Hoop', 'Clip']
    },
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],
  küpe: [
    {
      name: 'closure',
      label: 'Küpe Tipi',
      type: 'select',
      required: true,
      options: ['Klipsli', 'Toplu', 'Vidalı', 'İttirme']
    },
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],

  // Pendants - kolye ucu
  pendants: [
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],
  'kolye ucu': [
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],

  // Sets - takı seti
  sets: [
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],
  'takı seti': [
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ],

  // Watches - saat
  watches: [
    {
      name: 'strap',
      label: 'Strap Material',
      type: 'select',
      required: true,
      options: ['Leather', 'Metal', 'Silicone', 'Fabric']
    },
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: false,
      options: ['14K', '18K']
    }
  ],
  saat: [
    {
      name: 'strap',
      label: 'Kordon Malzemesi',
      type: 'select',
      required: true,
      options: ['Deri', 'Metal', 'Silikon', 'Kumaş']
    },
    {
      name: 'milyem',
      label: 'Altın Ayarı',
      type: 'radio',
      required: false,
      options: ['14K', '18K']
    }
  ]
};

export function getCategoryVariations(category: string): VariationConfig[] {
  const normalized = category?.toLowerCase().trim();
  return DEFAULT_VARIATIONS[normalized] || DEFAULT_VARIATIONS[normalized + 's'] || getDefaultVariations();
}

export function getDefaultVariations(): VariationConfig[] {
  return [
    {
      name: 'milyem',
      label: 'Gold Purity',
      type: 'radio',
      required: true,
      options: ['14K', '18K', '22K', '24K']
    }
  ];
}

export function getAllVariationNames(): string[] {
  const names = new Set<string>();
  Object.values(DEFAULT_VARIATIONS).forEach(configs => {
    configs.forEach(config => names.add(config.name));
  });
  return Array.from(names);
}

export function getVariationLabel(category: string, variationName: string): string {
  const categoryVars = getCategoryVariations(category);
  const found = categoryVars.find(v => v.name === variationName);
  return found?.label || variationName;
}
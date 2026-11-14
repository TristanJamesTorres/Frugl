import { modelLabel, type CatalogModel } from './match';
import type { Hints } from './types';

export function modelPrefill(model: CatalogModel, hints: Hints) {
  const label = modelLabel(model);
  return {
    model_id: model.id,
    brand: model.brand,
    model: label,
    title: [model.brand, label].filter(Boolean).join(' '),
    cpu: hints.cpu ?? null,
    gpu: hints.gpu ?? null,
    screen_size: null,
    ram: hints.ram ?? null,
    storage: hints.storage ?? null,
    description: hints.notes ?? '',
    ai_filled: ['title', 'brand', 'model'],
  };
}

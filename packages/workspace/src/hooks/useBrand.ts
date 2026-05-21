import { useEffect, useMemo, useState } from "react";
import { fetchBrands } from "../api";
import type { Brand, BrandRecord, DraftColors } from "../types";

export interface UseBrandArgs {
  templateColors: DraftColors;
  selectedBrandId?: string;
}

export interface UseBrandResult {
  brands: BrandRecord[];
  selectedBrandId: string | undefined;
  selectedBrand: Brand;
  colors: DraftColors;
  loading: boolean;
  error: string | null;
  selectBrand: (brandId: string | undefined) => void;
}

export function mapBrandRecord(record: BrandRecord): Brand {
  return {
    name: record.name,
    logoBase64: record.logo_url ?? "",
    website: record.website ?? "",
    font_family: record.font_family,
    colors: record.colors,
  };
}

function emptyBrand(colors: DraftColors): Brand {
  return {
    name: "",
    logoBase64: "",
    website: "",
    colors,
  };
}

export function useBrand({ templateColors, selectedBrandId }: UseBrandArgs): UseBrandResult {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [manualBrandId, setManualBrandId] = useState<string | undefined>(selectedBrandId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setManualBrandId(selectedBrandId);
  }, [selectedBrandId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchBrands()
      .then((records) => {
        if (cancelled) return;
        setBrands(records);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load brands");
        setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedBrandId = manualBrandId ?? brands[0]?.id;
  const selectedRecord = brands.find((brand) => brand.id === resolvedBrandId);

  const selectedBrand = useMemo(
    () => (selectedRecord ? mapBrandRecord(selectedRecord) : emptyBrand(templateColors)),
    [selectedRecord, templateColors],
  );

  return {
    brands,
    selectedBrandId: selectedRecord?.id,
    selectedBrand,
    colors: selectedBrand.colors,
    loading,
    error,
    selectBrand: setManualBrandId,
  };
}

/**
 * @fileoverview React hook for loading and validating game configurations
 */

import { useState, useEffect } from 'react';
import type { GameConfig } from '../core/config/types';
import { loadGameConfig } from '../core/config/loader';

export interface ConfigLoaderResult {
  config: GameConfig | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useConfigLoader(
  yamlData: unknown,
  configPath?: string
): ConfigLoaderResult {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const validatedConfig = loadGameConfig(yamlData, configPath);
      setConfig(validatedConfig);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setConfig(null);
      setLoading(false);
    }
  }, [yamlData, configPath, reloadTrigger]);

  const reload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  return { config, loading, error, reload };
}

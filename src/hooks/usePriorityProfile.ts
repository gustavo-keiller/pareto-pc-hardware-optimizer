import { useCallback, useEffect, useMemo, useState } from 'react';
import { PriorityProfile } from '../lib/math/priorityModel';
import {
  applyTopsisWeights,
  parsePriorityProfile,
  profileToTopsisWeights,
} from '../lib/math/priorityProfiles';
import { PreferenceWeights } from '../lib/math/types';
import { safeGetJSON, safeSetJSON } from '../utils/storage';

const PROFILE_KEY = 'paretopc_priority_profile_v1';
const LEGACY_WEIGHTS_KEY = 'paretopc_weights';

/**
 * The user's priorities (PRI-06): one source of truth for every mode.
 * Simple mode edits the full profile; Explorer and Pro keep editing five-metric
 * TOPSIS weights, which are read from and written back into the same profile.
 */
export function usePriorityProfile() {
  const [profile, setProfile] = useState<PriorityProfile>(() =>
    parsePriorityProfile(
      safeGetJSON<unknown>(PROFILE_KEY, null),
      safeGetJSON<unknown>(LEGACY_WEIGHTS_KEY, null),
    ),
  );

  useEffect(() => {
    safeSetJSON(PROFILE_KEY, profile);
  }, [profile]);

  const weights = useMemo(() => profileToTopsisWeights(profile), [profile]);

  useEffect(() => {
    safeSetJSON(LEGACY_WEIGHTS_KEY, weights);
  }, [weights]);

  const setWeights = useCallback(
    (
      next:
        PreferenceWeights | ((prev: PreferenceWeights) => PreferenceWeights),
    ) => {
      setProfile((prev) =>
        applyTopsisWeights(
          prev,
          typeof next === 'function'
            ? next(profileToTopsisWeights(prev))
            : next,
        ),
      );
    },
    [],
  );

  return { profile, setProfile, weights, setWeights };
}

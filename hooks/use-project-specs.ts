"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchProjectSpecs } from "@/lib/project-specs"
import type { ProjectSpecSummary } from "@/types/project-spec"

interface UseProjectSpecsResult {
  specs: ProjectSpecSummary[]
  loading: boolean
  error: string | null
  /** Re-fetches the list — used after a spec run finishes generating a new one. */
  refresh: () => void
}

/**
 * Loads a project's generated specs on mount, whenever `projectId` changes,
 * and on demand via `refresh` (needed once the Specs tab can trigger
 * generation itself — a finished run doesn't otherwise change `projectId` to
 * re-trigger the effect).
 */
export function useProjectSpecs(projectId: string): UseProjectSpecsResult {
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let active = true

    async function loadSpecs() {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchProjectSpecs(projectId)
        if (active) setSpecs(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load specs.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadSpecs()

    return () => {
      active = false
    }
  }, [projectId, reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  return { specs, loading, error, refresh }
}

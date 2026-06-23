import type { Project } from "@/types/project"

/**
 * Static mock project data for the editor sidebar. Replaced by real
 * project queries once persistence is wired up.
 */
export const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "Realtime Chat Platform", slug: "realtime-chat-platform", ownership: "owned" },
  { id: "p2", name: "Event-Driven Orders", slug: "event-driven-orders", ownership: "owned" },
  { id: "p3", name: "Payments Microservices", slug: "payments-microservices", ownership: "owned" },
  { id: "p4", name: "Analytics Pipeline", slug: "analytics-pipeline", ownership: "shared" },
  { id: "p5", name: "IoT Ingestion Mesh", slug: "iot-ingestion-mesh", ownership: "shared" },
]

export const MOCK_OWNED_PROJECTS = MOCK_PROJECTS.filter(
  (project) => project.ownership === "owned"
)

export const MOCK_SHARED_PROJECTS = MOCK_PROJECTS.filter(
  (project) => project.ownership === "shared"
)

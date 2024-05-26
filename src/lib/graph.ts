import { BrainDB } from "@braindb/core";
import { bdb, isContent } from "./braindb.mjs";
import graphology from "graphology";
import circular from "graphology-layout/circular";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { tagColor } from "./tagColor";

// @ts-ignore
const { MultiGraph } = graphology;

export async function toGraphologyJson(db: BrainDB) {
  const nodes = (await db.documents()).filter(isContent).map((document) => ({
    key: document.id(),
    attributes: {
      label: document.frontmatter().title as string,
      url: document.url(),
      color:
        // @ts-expect-error
        document.frontmatter().tags && document.frontmatter().tags.length === 1
          ? // @ts-expect-error
            tagColor(document.frontmatter().tags[0])
          : undefined,
    },
  }));

  const edges = (await db.links())
    .filter(
      (link) =>
        link.to() !== null && isContent(link.to()!) && isContent(link.from())
    )
    .map((link) => ({
      source: link.from().id(),
      target: link.to()?.id(),
    }));

  const tagsAll = (await db.documents())
    .map((document) => {
      const tags = document.frontmatter().tags;
      return Array.isArray(tags) ? tags : [];
    })
    .flat();

  const tagNodes = [...new Set(tagsAll)].map((tag) => ({
    key: tag,
    attributes: {
      label: `#${tag}`,
      color: tagColor(tag as string),
      url: "",
      size: 0.4,
    },
  }));

  const tagEdges = (await db.documents())
    .map((document) => {
      const tags = document.frontmatter().tags;
      if (!Array.isArray(tags)) return [];
      return tags.map((tag) => ({
        source: tag,
        target: document.id(),
      }));
    })
    .flat();

  return {
    attributes: { name: "g" },
    options: {
      allowSelfLoops: true,
      multi: true,
      type: "directed",
    },
    nodes: [...nodes, ...tagNodes],
    edges: [...edges, ...tagEdges],
  };
}

export async function getGraph() {
  const graph = new MultiGraph();
  const data = await toGraphologyJson(bdb);
  graph.import(data as any);
  circular.assign(graph);
  forceAtlas2.assign(graph, 2000);
  return graph;
}

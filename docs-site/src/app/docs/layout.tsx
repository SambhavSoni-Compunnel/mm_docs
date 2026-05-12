import { buildDocTree, getAllDocFiles } from "@/lib/docs";
import { DocsLayoutClient } from "@/components/docs-layout-client";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tree = buildDocTree();
  const allDocs = getAllDocFiles();

  const searchData = allDocs.map((d) => ({
    slug: d.slug,
    title: d.title,
    description: d.description || "",
    body: d.body,
  }));

  return (
    <DocsLayoutClient tree={tree} searchData={searchData}>
      {children}
    </DocsLayoutClient>
  );
}

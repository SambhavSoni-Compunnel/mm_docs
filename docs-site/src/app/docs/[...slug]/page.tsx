import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDocBySlug, getAllSlugs, getFlatNavList, getPrevNext } from "@/lib/docs";
import { DocContent } from "@/components/doc-content";
import { TableOfContents } from "@/components/table-of-contents";
import { PrevNextNav } from "@/components/prev-next-nav";
import { Breadcrumb } from "@/components/breadcrumb";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();

  // Also register folder-level slugs so they aren't hard 404s
  const folderSlugs = new Set<string>();
  for (const slug of slugs) {
    for (let i = 1; i < slug.length; i++) {
      folderSlugs.add(slug.slice(0, i).join("/"));
    }
  }

  const fileParams = slugs.map((slug) => ({ slug }));
  const folderParams = Array.from(folderSlugs).map((s) => ({ slug: s.split("/") }));

  return [...fileParams, ...folderParams];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.frontmatter.description,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  if (!doc) {
    // Check if this slug is a folder prefix — redirect to first child
    const prefix = slug.join("/");
    const all = getFlatNavList();
    const firstChild = all.find((f) => f.slug.join("/").startsWith(prefix + "/"));
    if (firstChild) redirect(`/docs/${firstChild.slug.join("/")}`);
    notFound();
  }

  const { prev, next } = getPrevNext(slug);

  return (
    <div className="flex gap-8 max-w-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 py-8 px-4 lg:px-8">
        <Breadcrumb slug={slug} title={doc.title} />
        <DocContent html={doc.content} title={doc.title} />
        <PrevNextNav prev={prev} next={next} />
      </div>

      {/* Right TOC */}
      {doc.toc.length > 1 && (
        <div className="hidden xl:block w-64 shrink-0 py-8 pr-4">
          <TableOfContents toc={doc.toc} />
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { FileText, Loader2, Newspaper, Pencil, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react'
import { RichTextEditor } from '@/components/RichTextEditor'
import { SafeImage } from '@/components/ui/safe-image'
import { Button } from '@/components/ui/button'
import { api, type CmsPost, type PostInput, type PostListResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

const emptyPost: PostInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: '',
  image: '',
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
  focusKeyword: '',
  canonicalUrl: '',
  metaRobots: 'index,follow',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  publishedAt: '',
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function localDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function seoScore(post: PostInput) {
  const words = post.content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const title = post.seoTitle || post.title
  const checks = [
    post.title.trim().length >= 20,
    title.length >= 30 && title.length <= 65,
    post.seoDescription.length >= 120 && post.seoDescription.length <= 170,
    post.excerpt.length >= 80,
    Boolean(post.focusKeyword.trim()),
    Boolean(post.image.trim()),
    words >= 300,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function statusClass(status: CmsPost['status']) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (status === 'scheduled') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-slate-100 text-slate-600 ring-slate-500/20'
}

export function AdminPostsWorkspace() {
  const [posts, setPosts] = useState<CmsPost[]>([])
  const [meta, setMeta] = useState<PostListResponse['meta']>({ currentPage: 1, perPage: 25, total: 0, lastPage: 1 })
  const [summary, setSummary] = useState<PostListResponse['summary']>({ total: 0, published: 0, drafts: 0, scheduled: 0 })
  const [categories, setCategories] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('updated_desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<CmsPost | null>(null)
  const [form, setForm] = useState<PostInput>(emptyPost)
  const [editorTab, setEditorTab] = useState<'content' | 'seo' | 'social'>('content')
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1)
      setLoading(true)
      setError('')
      setSearch(searchInput.trim())
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    api.adminPosts({ page, perPage, search, status, category, sort })
      .then((result) => {
        if (cancelled) return
        setPosts(result.data)
        setMeta(result.meta)
        setSummary(result.summary)
        setCategories(result.categories)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load posts.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, perPage, search, status, category, sort])

  async function refreshPosts(targetPage = page) {
    const result = await api.adminPosts({ page: targetPage, perPage, search, status, category, sort })
    setPosts(result.data)
    setMeta(result.meta)
    setSummary(result.summary)
    setCategories(result.categories)
  }

  function newPost() {
    setEditing(null)
    setForm(emptyPost)
    setEditorTab('content')
    setShowEditor(true)
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editPost(post: CmsPost) {
    setEditing(post)
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      image: post.image,
      status: post.status,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      focusKeyword: post.focusKeyword,
      canonicalUrl: post.canonicalUrl,
      metaRobots: post.metaRobots,
      ogTitle: post.ogTitle,
      ogDescription: post.ogDescription,
      ogImage: post.ogImage,
      publishedAt: localDateTime(post.publishedAt),
    })
    setEditorTab('content')
    setShowEditor(true)
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await (editing ? api.updatePost(editing.id, form) : api.createPost(form))
      setShowEditor(false)
      setEditing(null)
      setForm(emptyPost)
      setMessage(editing ? 'Post updated.' : 'Post created.')
      await refreshPosts(editing ? page : 1)
      if (!editing) setPage(1)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save post.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePost(post: CmsPost) {
    if (!window.confirm(`Delete “${post.title}”?`)) return
    setError('')
    try {
      await api.deletePost(post.id)
      setMessage('Post deleted.')
      await refreshPosts(posts.length === 1 && page > 1 ? page - 1 : page)
      if (posts.length === 1 && page > 1) setPage(page - 1)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete post.')
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    setError('')
    try {
      const result = await api.uploadMedia(file)
      setForm((current) => ({ ...current, image: result.media.url, ogImage: current.ogImage || result.media.url }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload image.')
    } finally {
      setUploading(false)
    }
  }

  const score = seoScore(form)
  const from = meta.total === 0 ? 0 : ((meta.currentPage - 1) * meta.perPage) + 1
  const to = Math.min(meta.total, meta.currentPage * meta.perPage)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">Content</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Posts</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Plan, write, optimize, schedule, and manage your content library.</p>
        </div>
        <Button type="button" className="min-h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700" onClick={newPost}>
          <Plus className="mr-2 h-4 w-4" />New post
        </Button>
      </header>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['All posts', summary.total, 'text-slate-900'],
          ['Published', summary.published, 'text-emerald-700'],
          ['Drafts', summary.drafts, 'text-slate-600'],
          ['Scheduled', summary.scheduled, 'text-amber-700'],
        ].map(([label, value, tone]) => (
          <article key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
            <p className={cn('mt-2 text-2xl font-black sm:text-3xl', String(tone))}>{Number(value).toLocaleString()}</p>
          </article>
        ))}
      </section>

      {showEditor ? (
        <form className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" onSubmit={savePost}>
          <header className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-blue-600">{editing ? `Editing #${editing.id}` : 'New post'}</p>
              <h2 className="mt-1 truncate text-xl font-black text-slate-950">{form.title || 'Untitled post'}</h2>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="rounded-xl border border-slate-200" onClick={() => setShowEditor(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
              <Button type="submit" className="rounded-xl bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{editing ? 'Save changes' : 'Create post'}
              </Button>
            </div>
          </header>

          <nav className="flex overflow-x-auto border-b border-slate-200 px-3 sm:px-6" aria-label="Post editor sections">
            {([['content', 'Content'], ['seo', 'Search preview'], ['social', 'Social sharing']] as const).map(([id, label]) => (
              <button key={id} type="button" className={cn('min-h-12 whitespace-nowrap border-b-2 px-4 text-sm font-bold', editorTab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900')} onClick={() => setEditorTab(id)}>{label}</button>
            ))}
          </nav>

          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-5">
              {editorTab === 'content' ? <ContentEditor form={form} setForm={setForm} editing={editing} categories={categories} uploading={uploading} uploadImage={uploadImage} /> : null}
              {editorTab === 'seo' ? <SeoEditor form={form} setForm={setForm} /> : null}
              {editorTab === 'social' ? <SocialEditor form={form} setForm={setForm} /> : null}
            </div>
            <SeoChecklist form={form} score={score} />
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(240px,1fr)_170px_170px_170px_auto]">
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 outline-none focus:border-blue-500" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search title, slug, excerpt..." /></label>
          <select className="min-h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" value={status} onChange={(event) => { setPage(1); setLoading(true); setError(''); setStatus(event.target.value) }}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select>
          <select className="min-h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" value={category} onChange={(event) => { setPage(1); setLoading(true); setError(''); setCategory(event.target.value) }}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="min-h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" value={sort} onChange={(event) => { setPage(1); setLoading(true); setError(''); setSort(event.target.value) }}><option value="updated_desc">Recently updated</option><option value="published_desc">Recently published</option><option value="title_asc">Title A-Z</option><option value="updated_asc">Oldest updated</option></select>
          <select className="min-h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" value={perPage} onChange={(event) => { setPage(1); setLoading(true); setError(''); setPerPage(Number(event.target.value)) }} aria-label="Posts per page"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select>
        </div>

        {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : posts.length === 0 ? <EmptyPosts /> : <PostList posts={posts} editPost={editPost} deletePost={deletePost} />}

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Showing {from.toLocaleString()}-{to.toLocaleString()} of {meta.total.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="rounded-lg border border-slate-200" disabled={meta.currentPage <= 1} onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)) }}>Previous</Button>
            <span className="min-w-20 text-center text-sm font-bold text-slate-600">{meta.currentPage} / {Math.max(1, meta.lastPage)}</span>
            <Button type="button" variant="ghost" className="rounded-lg border border-slate-200" disabled={meta.currentPage >= meta.lastPage} onClick={() => { setLoading(true); setPage((current) => Math.min(meta.lastPage, current + 1)) }}>Next</Button>
          </div>
        </footer>
      </section>
    </div>
  )
}

type EditorProps = { form: PostInput; setForm: Dispatch<SetStateAction<PostInput>> }

function ContentEditor({ form, setForm, editing, categories, uploading, uploadImage }: EditorProps & { editing: CmsPost | null; categories: string[]; uploading: boolean; uploadImage: (file: File) => Promise<void> }) {
  return <>
    <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Post title</span><input className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-lg font-bold outline-none focus:border-blue-500" value={form.title} onChange={(event) => { const title = event.target.value; setForm((current) => ({ ...current, title, slug: !editing && (!current.slug || current.slug === slugify(current.title)) ? slugify(title) : current.slug })) }} placeholder="A clear title your customer would search for" required /></label>
    <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">URL slug</span><div className="flex min-h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500"><span className="hidden border-r border-slate-200 px-3 text-sm text-slate-500 sm:block">/blog/</span><input className="min-w-0 flex-1 bg-transparent px-3 outline-none" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} placeholder="post-url" /></div></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold text-slate-700">Category</span><input className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" list="post-categories" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Guides" /><datalist id="post-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label><label><span className="mb-2 block text-sm font-bold text-slate-700">Status</span><select className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PostInput['status'] }))}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label></div>
    {form.status === 'scheduled' ? <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Publish date and time</span><input type="datetime-local" className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.publishedAt} onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))} required /></label> : null}
    <label className="block"><span className="mb-2 flex justify-between text-sm font-bold text-slate-700"><span>Excerpt</span><span className="font-medium text-slate-400">{form.excerpt.length}/160</span></span><textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Summarize the value of this post in plain language." /></label>
    <div><span className="mb-2 block text-sm font-bold text-slate-700">Article content</span><RichTextEditor className="min-h-80" value={form.content} onChange={(content) => setForm((current) => ({ ...current, content }))} placeholder="Write a useful, structured article..." /></div>
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label><span className="mb-2 block text-sm font-bold text-slate-700">Featured image URL</span><input className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} placeholder="/uploads/post-cover.jpg" /></label><label className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload<input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0])} /></label></div>
  </>
}

function SeoEditor({ form, setForm }: EditorProps) {
  return <>
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5"><p className="text-xs text-slate-500">bakhtech.com.ng/blog/{form.slug || 'post-url'}</p><p className="mt-1 text-xl text-blue-700">{form.seoTitle || form.title || 'Post title'}</p><p className="mt-1 text-sm leading-6 text-slate-600">{form.seoDescription || form.excerpt || 'Add a concise description explaining what readers will learn.'}</p></div>
    <label className="block"><span className="mb-2 flex justify-between text-sm font-bold text-slate-700"><span>Search title</span><span className="font-medium text-slate-400">{form.seoTitle.length}/60</span></span><input className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.seoTitle} onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))} placeholder={form.title || 'Search result title'} /></label>
    <label className="block"><span className="mb-2 flex justify-between text-sm font-bold text-slate-700"><span>Meta description</span><span className="font-medium text-slate-400">{form.seoDescription.length}/160</span></span><textarea className="min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" value={form.seoDescription} onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))} placeholder="Explain the article clearly and give readers a reason to open it." /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold text-slate-700">Focus phrase</span><input className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.focusKeyword} onChange={(event) => setForm((current) => ({ ...current, focusKeyword: event.target.value }))} placeholder="business website guide" /></label><label><span className="mb-2 block text-sm font-bold text-slate-700">Robots</span><select className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.metaRobots} onChange={(event) => setForm((current) => ({ ...current, metaRobots: event.target.value }))}><option value="index,follow">Index, follow</option><option value="index,nofollow">Index, nofollow</option><option value="noindex,follow">Noindex, follow</option><option value="noindex,nofollow">Noindex, nofollow</option></select></label></div>
    <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Canonical URL</span><input type="url" className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.canonicalUrl} onChange={(event) => setForm((current) => ({ ...current, canonicalUrl: event.target.value }))} placeholder={`https://bakhtech.com.ng/blog/${form.slug || 'post-url'}`} /></label>
  </>
}

function SocialEditor({ form, setForm }: EditorProps) {
  return <>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><SafeImage src={form.ogImage || form.image || '/social-preview.png'} alt="Social preview" className="aspect-[1.91/1] w-full object-cover" /><div className="p-4"><p className="text-xs uppercase text-slate-500">bakhtech.com.ng</p><p className="mt-1 font-black text-slate-900">{form.ogTitle || form.seoTitle || form.title || 'Post title'}</p><p className="mt-1 text-sm text-slate-600">{form.ogDescription || form.seoDescription || form.excerpt || 'Post description'}</p></div></div>
    <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Social title</span><input className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.ogTitle} onChange={(event) => setForm((current) => ({ ...current, ogTitle: event.target.value }))} placeholder="Leave blank to use the search title" /></label>
    <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Social description</span><textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" value={form.ogDescription} onChange={(event) => setForm((current) => ({ ...current, ogDescription: event.target.value }))} placeholder="Leave blank to use the meta description" /></label>
    <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Social image URL</span><input className="min-h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={form.ogImage} onChange={(event) => setForm((current) => ({ ...current, ogImage: event.target.value }))} placeholder="Leave blank to use the featured image" /></label>
  </>
}

function SeoChecklist({ form, score }: { form: PostInput; score: number }) {
  const words = form.content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const checks: Array<[string, boolean]> = [['Clear title', form.title.length >= 20], ['Useful excerpt', form.excerpt.length >= 80], ['Meta description', form.seoDescription.length >= 120], ['Focus phrase', Boolean(form.focusKeyword.trim())], ['Featured image', Boolean(form.image.trim())], ['In-depth content', words >= 300]]
  return <aside className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-6"><div className="rounded-lg bg-slate-950 p-5 text-white"><div className="flex items-center justify-between"><span className="text-sm font-bold">Content score</span><span className={cn('text-2xl font-black', score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-300' : 'text-red-300')}>{score}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className={cn('h-full rounded-full', score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-300' : 'bg-red-400')} style={{ width: `${score}%` }} /></div></div><div className="space-y-3 text-sm">{checks.map(([label, complete]) => <div key={label} className="flex items-center gap-2"><span className={cn('grid h-5 w-5 place-items-center rounded-full text-xs font-black', complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>{complete ? 'Y' : '-'}</span><span className={complete ? 'text-slate-700' : 'text-slate-500'}>{label}</span></div>)}</div></aside>
}

function EmptyPosts() {
  return <div className="grid min-h-52 place-items-center px-6 text-center"><div><Newspaper className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No posts found</p><p className="mt-1 text-sm text-slate-500">Adjust your filters or create a new post.</p></div></div>
}

function PostList({ posts, editPost, deletePost }: { posts: CmsPost[]; editPost: (post: CmsPost) => void; deletePost: (post: CmsPost) => Promise<void> }) {
  return <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Post</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Content</th><th className="px-4 py-3">Updated</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{posts.map((post) => <tr key={post.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><PostIdentity post={post} /></td><td className="px-4 py-4"><StatusBadge status={post.status} /></td><td className="px-4 py-4 text-sm text-slate-600">{post.category || 'Uncategorized'}</td><td className="px-4 py-4 text-sm text-slate-600">{post.wordCount.toLocaleString()} words<br /><span className="text-xs text-slate-400">{post.readingTime} min read</span></td><td className="px-4 py-4 text-sm text-slate-600">{new Date(post.updatedAt).toLocaleDateString()}</td><td className="px-5 py-4"><PostActions post={post} editPost={editPost} deletePost={deletePost} /></td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 md:hidden">{posts.map((post) => <article key={post.id} className="p-4"><PostIdentity post={post} mobile /><div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={post.status} /><span className="text-xs text-slate-500">{post.category || 'Uncategorized'}</span><span className="text-xs text-slate-400">{post.wordCount.toLocaleString()} words · {post.readingTime} min</span></div><div className="mt-3 border-t border-slate-100 pt-3"><PostActions post={post} editPost={editPost} deletePost={deletePost} /></div></article>)}</div></>
}

function PostIdentity({ post, mobile = false }: { post: CmsPost; mobile?: boolean }) {
  return <div className="flex min-w-0 items-center gap-3">{post.image ? <SafeImage src={post.image} alt="" className={cn('shrink-0 rounded-md object-cover', mobile ? 'h-16 w-20' : 'h-12 w-16')} /> : <span className={cn('grid shrink-0 place-items-center rounded-md bg-slate-100', mobile ? 'h-16 w-20' : 'h-12 w-16')}><FileText className="h-5 w-5 text-slate-400" /></span>}<div className="min-w-0"><p className={cn('font-bold text-slate-900', mobile ? 'line-clamp-2' : 'max-w-md truncate')}>{post.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">/blog/{post.slug}</p></div></div>
}

function StatusBadge({ status }: { status: CmsPost['status'] }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset', statusClass(status))}>{status}</span>
}

function PostActions({ post, editPost, deletePost }: { post: CmsPost; editPost: (post: CmsPost) => void; deletePost: (post: CmsPost) => Promise<void> }) {
  return <div className="flex justify-end gap-1"><Button type="button" variant="ghost" className="h-9 px-3" onClick={() => editPost(post)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button><Button type="button" variant="ghost" className="h-9 w-9 p-0 text-red-500" title="Delete post" onClick={() => void deletePost(post)}><Trash2 className="h-4 w-4" /></Button></div>
}

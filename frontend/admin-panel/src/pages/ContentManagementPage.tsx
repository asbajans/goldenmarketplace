import { useState, useEffect } from 'react';
import { Card, Tabs, Input, Button, message, Row, Col, List, Switch, Modal, Table, Tag } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;

const LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
  { key: 'es', label: 'Español', flag: '🇪🇸' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const PAGE_KEYS = ['homepage', 'about', 'blog', 'footer'];
const PAGE_LABELS: Record<string, string> = {
  homepage: 'Ana Sayfa',
  about: 'Hakkımızda',
  blog: 'Blog',
  footer: 'Footer'
};

const initialTranslations = LANGUAGES.reduce((acc, lang) => {
  acc[lang.key] = { title: '', subtitle: '', excerpt: '', content: '' };
  return acc;
}, {} as Record<string, any>);

function ensureSliderTranslations(item: any) {
  const translations = item.translations || {};
  const normalized = { ...translations };

  LANGUAGES.forEach(lang => {
    normalized[lang.key] = {
      title: translations[lang.key]?.title || item.title || '',
      subtitle: translations[lang.key]?.subtitle || item.subtitle || '',
    };
  });

  return {
    ...item,
    translations: normalized,
    imageUrl: item.imageUrl || '',
    link: item.link || '',
    videoUrl: item.videoUrl || '',
    order: item.order || 0,
  };
}

function ensureBlogTranslations(item: any) {
  const translations = item.translations || {};
  const normalized = { ...translations };

  LANGUAGES.forEach(lang => {
    normalized[lang.key] = {
      title: translations[lang.key]?.title || item.title || '',
      excerpt: translations[lang.key]?.excerpt || item.excerpt || '',
      content: translations[lang.key]?.content || item.content || '',
    };
  });

  return {
    ...item,
    translations: normalized,
    slug: item.slug || '',
    imageUrl: item.imageUrl || '',
    isActive: item.isActive !== false,
    order: item.order || 0,
  };
}

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState('pages');
  const [saving, setSaving] = useState(false);

  const [pageContents, setPageContents] = useState<Record<string, Record<string, { title: string; subtitle: string; description: string }>>>({});
  const [activePage, setActivePage] = useState('homepage');
  const [activeLang, setActiveLang] = useState('en');

  const [sliders, setSliders] = useState<any[]>([]);
  const [sliderModal, setSliderModal] = useState(false);
  const [editingSlider, setEditingSlider] = useState<any>(null);
  const [sliderLang, setSliderLang] = useState('en');
  const [sliderForm, setSliderForm] = useState({ imageUrl: '', link: '', videoUrl: '', translations: { ...initialTranslations }, order: 0 });

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuModal, setMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({ key: '', label: '', href: '', order: 0, visible: true });

  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [blogModal, setBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [blogLang, setBlogLang] = useState('en');
  const [blogForm, setBlogForm] = useState({ slug: '', imageUrl: '', isActive: true, order: 0, translations: { ...initialTranslations } });

  useEffect(() => {
    loadPageContents();
    loadSliders();
    loadMenuItems();
    loadBlogPosts();
  }, []);

  const loadPageContents = async () => {
    try {
      const allSettings = await AdminAPI.getSettings();
      const contents: Record<string, Record<string, any>> = {};

      PAGE_KEYS.forEach(page => {
        contents[page] = {};
        LANGUAGES.forEach(lang => {
          contents[page][lang.key] = {
            title: allSettings[`${page}_title_${lang.key}`] || '',
            subtitle: allSettings[`${page}_subtitle_${lang.key}`] || '',
            description: allSettings[`${page}_desc_${lang.key}`] || '',
          };
        });
      });

      setPageContents(contents);
    } catch (error) {
      console.error('Failed to load page contents:', error);
    }
  };

  const savePageContent = async () => {
    setSaving(true);
    try {
      const page = pageContents[activePage]?.[activeLang] || {};
      await AdminAPI.updateSettings({
        [`${activePage}_title_${activeLang}`]: page.title || '',
        [`${activePage}_subtitle_${activeLang}`]: page.subtitle || '',
        [`${activePage}_desc_${activeLang}`]: page.description || '',
      });
      message.success('Sayfa içeriği kaydedildi!');
    } catch (error) {
      message.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const updatePageContent = (field: string, value: string) => {
    setPageContents(prev => ({
      ...prev,
      [activePage]: {
        ...prev[activePage],
        [activeLang]: {
          ...prev[activePage]?.[activeLang] || { title: '', subtitle: '', description: '' },
          [field]: value,
        },
      },
    }));
  };

  const loadSliders = async () => {
    try {
      const settings = await AdminAPI.getSettings();
      const sliderData = settings.homepage_sliders ? JSON.parse(settings.homepage_sliders) : [];
      setSliders(sliderData.map((item: any) => ensureSliderTranslations(item)));
    } catch (error) {
      console.error('Failed to load sliders:', error);
    }
  };

  const saveSliders = async (items?: any[]) => {
    setSaving(true);
    try {
      const data = items ?? sliders;
      await AdminAPI.updateSettings({ homepage_sliders: JSON.stringify(data) });
      message.success('Slider kaydedildi!');
    } catch (error) {
      message.error('Slider kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const openSliderModal = (slider?: any) => {
    if (slider) {
      setEditingSlider(slider);
      setSliderForm({
        imageUrl: slider.imageUrl || '',
        link: slider.link || '',
        videoUrl: slider.videoUrl || '',
        translations: slider.translations || { ...initialTranslations },
        order: slider.order || 0,
      });
    } else {
      setEditingSlider(null);
      setSliderForm({
        imageUrl: '',
        link: '',
        videoUrl: '',
        translations: { ...initialTranslations },
        order: sliders.length + 1,
      });
    }
    setSliderLang('en');
    setSliderModal(true);
  };

  const updateSliderTranslation = (field: 'title' | 'subtitle', value: string) => {
    setSliderForm(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [sliderLang]: {
          ...prev.translations[sliderLang],
          [field]: value,
        }
      }
    }));
  };

  const saveSlider = () => {
    const item = {
      ...sliderForm,
      translations: sliderForm.translations,
      id: editingSlider?.id || Date.now(),
    };

    const updated = editingSlider
      ? sliders.map(s => s.id === editingSlider.id ? item : s)
      : [...sliders, item];

    setSliders(updated);
    setSliderModal(false);
    saveSliders(updated);
  };

  const deleteSlider = (id: number) => {
    const updated = sliders.filter(s => s.id !== id);
    setSliders(updated);
    saveSliders(updated);
  };

  const loadMenuItems = async () => {
    try {
      const settings = await AdminAPI.getSettings();
      const menuData = settings.homepage_menu ? JSON.parse(settings.homepage_menu) : [];
      setMenuItems(menuData);
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  };

  const saveMenuItems = async (items?: any[]) => {
    setSaving(true);
    try {
      const data = items ?? menuItems;
      await AdminAPI.updateSettings({ homepage_menu: JSON.stringify(data) });
      message.success('Menü kaydedildi!');
    } catch (error) {
      message.error('Menü kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const openMenuModal = (item?: any) => {
    if (item) {
      setEditingMenu(item);
      setMenuForm({ key: item.key, label: item.label, href: item.href, order: item.order || 0, visible: item.visible !== false });
    } else {
      setEditingMenu(null);
      setMenuForm({ key: '', label: '', href: '', order: menuItems.length + 1, visible: true });
    }
    setMenuModal(true);
  };

  const saveMenuItem = () => {
    const updated = editingMenu
      ? menuItems.map(m => m.key === editingMenu.key ? { ...m, ...menuForm } : m)
      : [...menuItems, { ...menuForm, key: menuForm.key || Date.now().toString() }];

    setMenuItems(updated);
    setMenuModal(false);
    saveMenuItems(updated);
  };

  const deleteMenuItem = (key: string) => {
    const updated = menuItems.filter(m => m.key !== key);
    setMenuItems(updated);
    saveMenuItems(updated);
  };

  const toggleMenuVisible = (key: string) => {
    const updated = menuItems.map(m => m.key === key ? { ...m, visible: !m.visible } : m);
    setMenuItems(updated);
    saveMenuItems(updated);
  };

  const loadBlogPosts = async () => {
    try {
      const settings = await AdminAPI.getSettings();
      const posts = settings.blog_posts ? JSON.parse(settings.blog_posts) : [];
      setBlogPosts(posts.map((item: any) => ensureBlogTranslations(item)));
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    }
  };

  const saveBlogPosts = async (posts: any[]) => {
    setSaving(true);
    try {
      await AdminAPI.updateSettings({ blog_posts: JSON.stringify(posts) });
      message.success('Blog yazıları kaydedildi!');
    } catch (error) {
      message.error('Blog kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const openBlogModal = (post?: any) => {
    if (post) {
      setEditingBlog(post);
      setBlogForm({
        slug: post.slug || '',
        imageUrl: post.imageUrl || '',
        isActive: post.isActive !== false,
        order: post.order || 0,
        translations: post.translations || { ...initialTranslations },
      });
    } else {
      setEditingBlog(null);
      setBlogForm({
        slug: '',
        imageUrl: '',
        isActive: true,
        order: blogPosts.length + 1,
        translations: { ...initialTranslations },
      });
    }
    setBlogLang('en');
    setBlogModal(true);
  };

  const updateBlogTranslation = (field: 'title' | 'excerpt' | 'content', value: string) => {
    setBlogForm(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [blogLang]: {
          ...prev.translations[blogLang],
          [field]: value,
        }
      }
    }));
  };

  const saveBlog = () => {
    const post = {
      ...blogForm,
      translations: blogForm.translations,
      id: editingBlog?.id || Date.now(),
    };

    const updated = editingBlog
      ? blogPosts.map(p => p.id === editingBlog.id ? post : p)
      : [...blogPosts, post];

    setBlogPosts(updated);
    setBlogModal(false);
    saveBlogPosts(updated);
  };

  const deleteBlogPost = (id: number) => {
    const updated = blogPosts.filter(p => p.id !== id);
    setBlogPosts(updated);
    saveBlogPosts(updated);
  };

  const currentPageContent = pageContents[activePage]?.[activeLang] || { title: '', subtitle: '', description: '' };

  const tabItems = [
    {
      key: 'pages',
      label: '📄 Sayfa İçerikleri',
      children: (
        <Row gutter={24}>
          <Col span={6}>
            <Card size="small" title="Sayfalar">
              {PAGE_KEYS.map(page => (
                <div
                  key={page}
                  onClick={() => setActivePage(page)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: activePage === page ? '#1890ff' : 'transparent',
                    color: activePage === page ? '#fff' : 'inherit',
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                >
                  {PAGE_LABELS[page]}
                </div>
              ))}
            </Card>
          </Col>
          <Col span={18}>
            <Card>
              <div style={{ marginBottom: 16 }}>
                <Tabs activeKey={activeLang} onChange={setActiveLang} type="card">
                  {LANGUAGES.map(lang => (
                    <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key} />
                  ))}
                </Tabs>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Başlık</label>
                <Input value={currentPageContent.title} onChange={e => updatePageContent('title', e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Alt Başlık</label>
                <Input value={currentPageContent.subtitle} onChange={e => updatePageContent('subtitle', e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>İçerik</label>
                <TextArea rows={6} value={currentPageContent.description} onChange={e => updatePageContent('description', e.target.value)} />
              </div>
              <Button type="primary" icon={<SaveOutlined />} onClick={savePageContent} loading={saving}>Kaydet</Button>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'sliders',
      label: '🎠 Slider',
      children: (
        <Card
          title="Ana Sayfa Slider"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openSliderModal()}>Yeni Slider</Button>}
        >
          <List
            dataSource={sliders}
            renderItem={slider => (
              <List.Item
                actions={[
                  <Button key="edit" icon={<EditOutlined />} onClick={() => openSliderModal(slider)}>Düzenle</Button>,
                  <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => deleteSlider(slider.id)}>Sil</Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<img src={slider.imageUrl} alt={slider.translations?.[activeLang]?.title || ''} style={{ width: 100, height: 60, objectFit: 'cover' }} />}
                  title={slider.translations?.[activeLang]?.title || 'Untitled'}
                  description={
                    <div>
                      <div>{slider.translations?.[activeLang]?.subtitle || ''}</div>
                      {slider.videoUrl && <div style={{ color: '#888', marginTop: 6 }}>Video: {slider.videoUrl}</div>}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'menu',
      label: '📋 Menü Yönetimi',
      children: (
        <Card
          title="Ana Sayfa Menü"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openMenuModal()}>Yeni Menü</Button>}
        >
          <Table
            dataSource={menuItems}
            rowKey="key"
            columns={[
              { title: 'Etiket', dataIndex: 'label' },
              { title: 'Link', dataIndex: 'href' },
              { title: 'Sıra', dataIndex: 'order', width: 80 },
              {
                title: 'Görünür',
                dataIndex: 'visible',
                width: 100,
                render: (val, record) => <Switch checked={val !== false} onChange={() => toggleMenuVisible(record.key)} />
              },
              {
                title: 'İşlem',
                width: 150,
                render: (_, record) => (
                  <>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openMenuModal(record)} style={{ marginRight: 8 }} />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMenuItem(record.key)} />
                  </>
                )
              }
            ]}
          />
        </Card>
      ),
    },
    {
      key: 'featured',
      label: '⭐ Öne Çıkan Ürünler',
      children: (
        <Card title="Ana Sayfa Öne Çıkan Ürünler">
          <p style={{ color: '#666' }}>Ana sayfada gösterilecek ürünleri seçin.</p>
          <Button type="primary" onClick={async () => {
            const products = await AdminAPI.getAllProducts({ limit: 100 });
            const featuredIds = products.data?.slice(0, 8).map((p: any) => p.id) || [];
            await AdminAPI.updateSettings({ homepage_featured_products: JSON.stringify(featuredIds) });
            message.success('Öne çıkan ürünler güncellendi!');
          }}>İlk 8 Ürünü Öne Çıkar</Button>
        </Card>
      ),
    },
    {
      key: 'blog',
      label: '📝 Blog Yazıları',
      children: (
        <Card
          title="Blog Yazıları"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openBlogModal()}>Yeni Yazı</Button>}
        >
          <Table
            dataSource={blogPosts}
            rowKey="id"
            columns={[
              {
                title: 'Başlık',
                render: (_: any, record: any) => record.translations?.[activeLang]?.title || record.slug || '—'
              },
              { title: 'Slug', dataIndex: 'slug' },
              {
                title: 'Durum',
                dataIndex: 'isActive',
                width: 100,
                render: (val: boolean) => <Tag color={val ? 'green' : 'red'}>{val ? 'Aktif' : 'Pasif'}</Tag>
              },
              {
                title: 'İşlem',
                width: 180,
                render: (_: any, record: any) => (
                  <>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openBlogModal(record)} style={{ marginRight: 8 }} />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteBlogPost(record.id)} />
                  </>
                )
              }
            ]}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>İçerik Yönetimi</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title={editingSlider ? 'Slider Düzenle' : 'Yeni Slider'}
        open={sliderModal}
        onOk={saveSlider}
        onCancel={() => setSliderModal(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <Tabs activeKey={sliderLang} onChange={setSliderLang} type="card">
            {LANGUAGES.map(lang => (
              <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key} />
            ))}
          </Tabs>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Başlık</label>
          <Input value={sliderForm.translations[sliderLang]?.title || ''} onChange={e => updateSliderTranslation('title', e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Alt Başlık</label>
          <Input value={sliderForm.translations[sliderLang]?.subtitle || ''} onChange={e => updateSliderTranslation('subtitle', e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Görsel URL</label>
          <Input value={sliderForm.imageUrl} onChange={e => setSliderForm({ ...sliderForm, imageUrl: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Video URL (YouTube)</label>
          <Input value={sliderForm.videoUrl} onChange={e => setSliderForm({ ...sliderForm, videoUrl: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Link</label>
          <Input value={sliderForm.link} onChange={e => setSliderForm({ ...sliderForm, link: e.target.value })} />
        </div>
      </Modal>

      <Modal
        title={editingMenu ? 'Menü Düzenle' : 'Yeni Menü'}
        open={menuModal}
        onOk={saveMenuItem}
        onCancel={() => setMenuModal(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <label>Etiket</label>
          <Input value={menuForm.label} onChange={e => setMenuForm({ ...menuForm, label: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Link</label>
          <Input value={menuForm.href} onChange={e => setMenuForm({ ...menuForm, href: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Sıra</label>
          <Input type="number" value={menuForm.order} onChange={e => setMenuForm({ ...menuForm, order: parseInt(e.target.value) || 0 })} />
        </div>
      </Modal>

      <Modal
        title={editingBlog ? 'Blog Yazısı Düzenle' : 'Yeni Blog Yazısı'}
        open={blogModal}
        onOk={saveBlog}
        onCancel={() => setBlogModal(false)}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <label>URL Slug</label>
          <Input value={blogForm.slug} onChange={e => setBlogForm({ ...blogForm, slug: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Kapak Görseli URL</label>
          <Input value={blogForm.imageUrl} onChange={e => setBlogForm({ ...blogForm, imageUrl: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Aktif mi?</label>
          <Switch checked={blogForm.isActive} onChange={checked => setBlogForm({ ...blogForm, isActive: checked })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Tabs activeKey={blogLang} onChange={setBlogLang} type="card">
            {LANGUAGES.map(lang => (
              <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key} />
            ))}
          </Tabs>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Başlık</label>
          <Input value={blogForm.translations[blogLang]?.title || ''} onChange={e => updateBlogTranslation('title', e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Önizleme Metni</label>
          <TextArea rows={3} value={blogForm.translations[blogLang]?.excerpt || ''} onChange={e => updateBlogTranslation('excerpt', e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>İçerik</label>
          <TextArea rows={8} value={blogForm.translations[blogLang]?.content || ''} onChange={e => updateBlogTranslation('content', e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

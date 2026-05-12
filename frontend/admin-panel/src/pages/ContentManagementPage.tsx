import { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Input, Button, message, Row, Col, List, Switch, Select, Upload, Modal, Table, Tag } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

const LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState('pages');
  const [saving, setSaving] = useState(false);
  
  // Page contents state
  const [pageContents, setPageContents] = useState<Record<string, Record<string, { title: string; subtitle: string; description: string }>>>({});
  const [activePage, setActivePage] = useState('homepage');
  const [activeLang, setActiveLang] = useState('en');
  
  // Slider state
  const [sliders, setSliders] = useState<any[]>([]);
  const [sliderModal, setSliderModal] = useState(false);
  const [editingSlider, setEditingSlider] = useState<any>(null);
  const [sliderForm, setSliderForm] = useState({ title: '', subtitle: '', imageUrl: '', link: '' });
  
  // Menu state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuModal, setMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({ key: '', label: '', href: '', order: 0, visible: true });
  
  // Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '', order: 0, isActive: true });

  useEffect(() => {
    loadPageContents();
    loadSliders();
    loadMenuItems();
    loadCategories();
  }, []);

  const loadPageContents = async () => {
    try {
      const allSettings = await AdminAPI.getSettings();
      const contents: Record<string, Record<string, any>> = {};
      
      const pageKeys = ['homepage', 'about', 'blog', 'footer'];
      for (const page of pageKeys) {
        contents[page] = {};
        for (const lang of LANGUAGES) {
          contents[page][lang.key] = {
            title: allSettings[`${page}_title_${lang.key}`] || '',
            subtitle: allSettings[`${page}_subtitle_${lang.key}`] || '',
            description: allSettings[`${page}_desc_${lang.key}`] || '',
          };
        }
      }
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

  // Slider functions
  const loadSliders = async () => {
    try {
      const settings = await AdminAPI.getSettings();
      const sliderData = settings.homepage_sliders ? JSON.parse(settings.homepage_sliders) : [];
      setSliders(sliderData);
    } catch (error) {
      console.error('Failed to load sliders:', error);
    }
  };

  const saveSliders = async () => {
    setSaving(true);
    try {
      await AdminAPI.updateSettings({ homepage_sliders: JSON.stringify(sliders) });
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
      setSliderForm({ title: slider.title, subtitle: slider.subtitle, imageUrl: slider.imageUrl, link: slider.link });
    } else {
      setEditingSlider(null);
      setSliderForm({ title: '', subtitle: '', imageUrl: '', link: '' });
    }
    setSliderModal(true);
  };

  const saveSlider = () => {
    if (editingSlider) {
      setSliders(prev => prev.map(s => s.id === editingSlider.id ? { ...s, ...sliderForm } : s));
    } else {
      setSliders(prev => [...prev, { id: Date.now(), ...sliderForm, order: sliders.length + 1 }]);
    }
    setSliderModal(false);
    saveSliders();
  };

  const deleteSlider = (id: number) => {
    setSliders(prev => prev.filter(s => s.id !== id));
    saveSliders();
  };

  // Menu functions
  const loadMenuItems = async () => {
    try {
      const settings = await AdminAPI.getSettings();
      const menuData = settings.homepage_menu ? JSON.parse(settings.homepage_menu) : [];
      setMenuItems(menuData);
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  };

  const saveMenuItems = async () => {
    setSaving(true);
    try {
      await AdminAPI.updateSettings({ homepage_menu: JSON.stringify(menuItems) });
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
    if (editingMenu) {
      setMenuItems(prev => prev.map(m => m.key === editingMenu.key ? { ...m, ...menuForm } : m));
    } else {
      setMenuItems(prev => [...prev, { ...menuForm, key: menuForm.key || Date.now().toString() }]);
    }
    setMenuModal(false);
    saveMenuItems();
  };

  const deleteMenuItem = (key: string) => {
    setMenuItems(prev => prev.filter(m => m.key !== key));
    saveMenuItems();
  };

  const toggleMenuVisible = (key: string) => {
    setMenuItems(prev => prev.map(m => m.key === key ? { ...m, visible: !m.visible } : m));
    saveMenuItems();
  };

  // Category functions
  const loadCategories = async () => {
    try {
      const cats = await AdminAPI.getCategories();
      setCategories(cats.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const openCategoryModal = (cat?: any) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, icon: cat.icon || '', order: cat.order || 0, isActive: cat.isActive !== false });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: '', order: categories.length + 1, isActive: true });
    }
    setCategoryModal(true);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await AdminAPI.updateCategory(editingCategory.id, categoryForm);
        message.success('Kategori güncellendi!');
      } else {
        await AdminAPI.createCategory(categoryForm);
        message.success('Kategori eklendi!');
      }
      setCategoryModal(false);
      loadCategories();
    } catch (error) {
      message.error('Kategori kaydetme hatası');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await AdminAPI.deleteCategory(id);
      message.success('Kategori silindi!');
      loadCategories();
    } catch (error) {
      message.error('Kategori silme hatası');
    }
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
              {['homepage', 'about', 'blog', 'footer'].map(page => (
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
                  {{ homepage: 'Ana Sayfa', about: 'Hakkımızda', blog: 'Blog', footer: 'Footer' }[page]}
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
                  avatar={<img src={slider.imageUrl} alt={slider.title} style={{ width: 100, height: 60, objectFit: 'cover' }} />}
                  title={slider.title}
                  description={slider.subtitle}
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
      key: 'categories',
      label: '📁 Kategoriler',
      children: (
        <Card
          title="Kategori Yönetimi"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openCategoryModal()}>Yeni Kategori</Button>}
        >
          <Table
            dataSource={categories}
            rowKey="id"
            columns={[
              { title: 'İkon', dataIndex: 'icon', width: 80, render: icon => icon || '✦' },
              { title: 'Kategori Adı', dataIndex: 'name' },
              { title: 'Sıra', dataIndex: 'order', width: 80 },
              { 
                title: 'Durum', 
                dataIndex: 'isActive',
                width: 100,
                render: val => <Tag color={val !== false ? 'green' : 'red'}>{val !== false ? 'Aktif' : 'Pasif'}</Tag>
              },
              {
                title: 'İşlem',
                width: 150,
                render: (_, record) => (
                  <>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openCategoryModal(record)} style={{ marginRight: 8 }} />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteCategory(record.id)} />
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
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>İçerik Yönetimi</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* Slider Modal */}
      <Modal
        title={editingSlider ? 'Slider Düzenle' : 'Yeni Slider'}
        open={sliderModal}
        onOk={saveSlider}
        onCancel={() => setSliderModal(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <label>Başlık</label>
          <Input value={sliderForm.title} onChange={e => setSliderForm({ ...sliderForm, title: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Alt Başlık</label>
          <Input value={sliderForm.subtitle} onChange={e => setSliderForm({ ...sliderForm, subtitle: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Görsel URL</label>
          <Input value={sliderForm.imageUrl} onChange={e => setSliderForm({ ...sliderForm, imageUrl: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Link</label>
          <Input value={sliderForm.link} onChange={e => setSliderForm({ ...sliderForm, link: e.target.value })} />
        </div>
      </Modal>

      {/* Menu Modal */}
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

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
        open={categoryModal}
        onOk={saveCategory}
        onCancel={() => setCategoryModal(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <label>Kategori Adı</label>
          <Input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>İkon (emoji)</label>
          <Input value={categoryForm.icon} onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Sıra</label>
          <Input type="number" value={categoryForm.order} onChange={e => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })} />
        </div>
      </Modal>
    </div>
  );
}
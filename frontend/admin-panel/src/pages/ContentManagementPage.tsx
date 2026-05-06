import { useState, useEffect } from 'react';
import { Card, Tabs, Input, Button, message, Select, Row, Col } from 'antd';
import { SaveOutlined, GlobalOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;

const PAGES = [
  { key: 'homepage', label: 'Ana Sayfa', titleKey: 'homepage_hero_title', subtitleKey: 'homepage_hero_subtitle', descKey: 'homepage_hero_desc' },
  { key: 'about', label: 'Hakkımızda', titleKey: 'about_title', subtitleKey: 'about_subtitle', descKey: 'about_description' },
  { key: 'blog', label: 'Blog', titleKey: 'blog_title', subtitleKey: 'blog_subtitle', descKey: 'blog_description' },
  { key: 'footer', label: 'Footer', titleKey: 'footer_about', subtitleKey: 'footer_contact', descKey: 'footer_copyright' },
];

const LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export default function ContentManagementPage() {
  const [activePage, setActivePage] = useState('homepage');
  const [activeLang, setActiveLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [contents, setContents] = useState<Record<string, Record<string, { title: string; subtitle: string; description: string }>>({
    homepage: { en: { title: '', subtitle: '', description: '' }, tr: { title: '', subtitle: '', description: '' }, it: { title: '', subtitle: '', description: '' }, ar: { title: '', subtitle: '', description: '' } },
    about: { en: { title: '', subtitle: '', description: '' }, tr: { title: '', subtitle: '', description: '' }, it: { title: '', subtitle: '', description: '' }, ar: { title: '', subtitle: '', description: '' } },
    blog: { en: { title: '', subtitle: '', description: '' }, tr: { title: '', subtitle: '', description: '' }, it: { title: '', subtitle: '', description: '' }, ar: { title: '', subtitle: '', description: '' } },
    footer: { en: { title: '', subtitle: '', description: '' }, tr: { title: '', subtitle: '', description: '' }, it: { title: '', subtitle: '', description: '' }, ar: { title: '', subtitle: '', description: '' } },
  });

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      const page = PAGES.find(p => p.key === activePage);
      if (!page) return;

      const langContents: Record<string, { title: string; subtitle: string; description: string }> = {};
      
      for (const lang of LANGUAGES) {
        const titleRes = await AdminAPI.getSetting(`${page.titleKey}_${lang.key}`);
        const subtitleRes = await AdminAPI.getSetting(`${page.subtitleKey}_${lang.key}`);
        const descRes = await AdminAPI.getSetting(`${page.descKey}_${lang.key}`);

        langContents[lang.key] = {
          title: titleRes.data?.value || '',
          subtitle: subtitleRes.data?.value || '',
          description: descRes.data?.value || '',
        };
      }

      setContents(prev => ({
        ...prev,
        [activePage]: langContents
      }));
    } catch (error) {
      console.error('Failed to load contents:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const page = PAGES.find(p => p.key === activePage);
      if (!page) return;

      const pageContents = contents[activePage][activeLang];
      
      await AdminAPI.updateSetting(`${page.titleKey}_${activeLang}`, pageContents.title);
      await AdminAPI.updateSetting(`${page.subtitleKey}_${activeLang}`, pageContents.subtitle);
      await AdminAPI.updateSetting(`${page.descKey}_${activeLang}`, pageContents.description);

      message.success('İçerik başarıyla kaydedildi!');
    } catch (error) {
      message.error('Kaydetme hatası: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const updateContent = (field: string, value: string) => {
    setContents(prev => ({
      ...prev,
      [activePage]: {
        ...prev[activePage],
        [activeLang]: {
          ...prev[activePage][activeLang],
          [field]: value
        }
      }
    }));
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>İçerik Yönetimi</h2>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={handleSave}
          loading={loading}
        >
          Kaydet
        </Button>
      </div>

      <Row gutter={24}>
        <Col span={6}>
          <Card size="small" title="Sayfalar">
            {PAGES.map(page => (
              <div 
                key={page.key}
                onClick={() => setActivePage(page.key)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: activePage === page.key ? '#1890ff' : 'transparent',
                  color: activePage === page.key ? '#fff' : 'inherit',
                  borderRadius: 4,
                  marginBottom: 4
                }}
              >
                {page.label}
              </div>
            ))}
          </Card>
        </Col>

        <Col span={18}>
          <Card>
            <Tabs activeKey={activeLang} onChange={setActiveLang} type="card">
              {LANGUAGES.map(lang => (
                <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key} />
              ))}
            </Tabs>

            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Başlık</label>
                <Input 
                  value={contents[activePage][activeLang].title}
                  onChange={(e) => updateContent('title', e.target.value)}
                  placeholder="Sayfa başlığını girin..."
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Alt Başlık</label>
                <Input 
                  value={contents[activePage][activeLang].subtitle}
                  onChange={(e) => updateContent('subtitle', e.target.value)}
                  placeholder="Alt başlığı girin..."
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>İçerik / Açıklama</label>
                <TextArea 
                  value={contents[activePage][activeLang].description}
                  onChange={(e) => updateContent('description', e.target.value)}
                  rows={8}
                  placeholder="İçeriği girin..."
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
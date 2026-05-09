import { useState, useEffect } from 'react';
import { Card, Tabs, Input, Button, message, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;

type LangContent = { title: string; subtitle: string; description: string };
type PageContents = Record<string, Record<string, LangContent>>;

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

const emptyLang = (): LangContent => ({ title: '', subtitle: '', description: '' });
const emptyPage = (): Record<string, LangContent> =>
  Object.fromEntries(LANGUAGES.map(l => [l.key, emptyLang()]));

const initialContents = (): PageContents =>
  Object.fromEntries(PAGES.map(p => [p.key, emptyPage()]));

export default function ContentManagementPage() {
  const [activePage, setActivePage] = useState('homepage');
  const [activeLang, setActiveLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [contents, setContents] = useState<PageContents>(initialContents());

  useEffect(() => {
    loadContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContents = async () => {
    try {
      // Fetch all settings at once (one network request)
      const allSettings: Record<string, string> = await AdminAPI.getSettings();

      setContents(prev => {
        const next: PageContents = { ...prev };
        for (const page of PAGES) {
          next[page.key] = {};
          for (const lang of LANGUAGES) {
            next[page.key][lang.key] = {
              title: allSettings[`${page.titleKey}_${lang.key}`] || '',
              subtitle: allSettings[`${page.subtitleKey}_${lang.key}`] || '',
              description: allSettings[`${page.descKey}_${lang.key}`] || '',
            };
          }
        }
        return next;
      });
    } catch (error) {
      console.error('Failed to load contents:', error);
      message.error('İçerikler yüklenemedi.');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const page = PAGES.find(p => p.key === activePage);
      if (!page) return;

      const pageContents = contents[activePage][activeLang];

      // Send all three keys for the active page+lang in one request
      await AdminAPI.updateSettings({
        [`${page.titleKey}_${activeLang}`]: pageContents.title,
        [`${page.subtitleKey}_${activeLang}`]: pageContents.subtitle,
        [`${page.descKey}_${activeLang}`]: pageContents.description,
      });

      message.success('İçerik başarıyla kaydedildi!');
    } catch (error) {
      message.error('Kaydetme hatası: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const updateContent = (field: keyof LangContent, value: string) => {
    setContents(prev => ({
      ...prev,
      [activePage]: {
        ...prev[activePage],
        [activeLang]: {
          ...prev[activePage][activeLang],
          [field]: value,
        },
      },
    }));
  };

  const currentContent = contents[activePage]?.[activeLang] ?? emptyLang();

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
                  marginBottom: 4,
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
                  value={currentContent.title}
                  onChange={e => updateContent('title', e.target.value)}
                  placeholder="Sayfa başlığını girin..."
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Alt Başlık</label>
                <Input
                  value={currentContent.subtitle}
                  onChange={e => updateContent('subtitle', e.target.value)}
                  placeholder="Alt başlığı girin..."
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>İçerik / Açıklama</label>
                <TextArea
                  value={currentContent.description}
                  onChange={e => updateContent('description', e.target.value)}
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
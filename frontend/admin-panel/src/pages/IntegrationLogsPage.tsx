import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { AdminAPI } from '../services/api';

interface IntegrationLog {
    id: string;
    userId: string;
    platform: string;
    endpoint: string;
    requestMethod: string;
    requestPayload: any;
    responseStatus: number;
    responsePayload: any;
    isSuccess: boolean;
    errorMessage: string | null;
    createdAt: string;
}

const IntegrationLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<IntegrationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterPlatform, setFilterPlatform] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>(''); // '' = all, 'true' = success, 'false' = error
    const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);

    const limit = 50;

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {
                limit: limit,
                offset: (page - 1) * limit
            };
            if (filterPlatform) params.platform = filterPlatform;
            if (filterStatus) params.isSuccess = filterStatus;

            const data = await AdminAPI.getIntegrationLogs(params);

            setLogs(data.logs);
            setTotalPages(data.pages || 1);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Loglar yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filterPlatform, filterStatus]);

    const handleRefresh = () => {
        if (page === 1) {
            fetchLogs();
        } else {
            setPage(1); // this will trigger fetch
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('tr-TR', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Entegrasyon API Logları</h1>
                <button
                    onClick={handleRefresh}
                    className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Yenile
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                    <select
                        className="p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500 min-w-[150px]"
                        value={filterPlatform}
                        onChange={(e) => { setFilterPlatform(e.target.value); setPage(1); }}
                    >
                        <option value="">Tümü</option>
                        <option value="trendyol">Trendyol</option>
                        <option value="n11">N11</option>
                        <option value="hepsiburada">Hepsiburada</option>
                        <option value="pazarama">Pazarama</option>
                        <option value="etsy">Etsy</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                    <select
                        className="p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500 min-w-[150px]"
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    >
                        <option value="">Tümü</option>
                        <option value="true">Başarılı (2xx)</option>
                        <option value="false">Hatalı (4xx/5xx)</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 border-b border-red-200">
                        {error}
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-yellow-500 mb-2" />
                                        Yükleniyor...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        Belirtilen kriterlere uygun log bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-l-4" style={{borderLeftColor: log.isSuccess ? '#10B981' : '#EF4444'}}>
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                                                {log.platform}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                                            <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded mr-2">{log.requestMethod}</span>
                                            {log.endpoint}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.isSuccess ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Başarılı {log.responseStatus && `(${log.responseStatus})`}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Hata {log.responseStatus && `(${log.responseStatus})`}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 p-2 rounded inline-flex items-center"
                                                title="Detayları Görüntüle"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Önceki
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Sonraki
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Sayfa <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Önceki</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Sonraki</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for Details */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedLog(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                                    Log Detayları
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                    <div>
                                        <span className="text-gray-500 block">HTTP İstek Metodu</span>
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1">{selectedLog.requestMethod}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Tarih</span>
                                        <span className="font-medium mt-1 inline-block">{formatDate(selectedLog.createdAt)}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500 block">Endpoint</span>
                                        <span className="font-mono truncate bg-gray-100 px-2 py-1 rounded inline-block mt-1 w-full overflow-x-auto">{selectedLog.endpoint}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500 block">Müşteri (User ID)</span>
                                        <span className="bg-gray-100 px-2 py-1 rounded inline-block mt-1">{selectedLog.userId || 'Bilinmiyor'}</span>
                                    </div>
                                    {selectedLog.errorMessage && (
                                        <div className="col-span-2 bg-red-50 p-3 rounded border border-red-200 text-red-700 mt-2">
                                            <strong>Hata Mesajı:</strong><br />
                                            {selectedLog.errorMessage}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                                    <div className="flex flex-col h-full border rounded">
                                        <div className="bg-gray-100 px-3 py-2 border-b font-medium text-gray-700 flex justify-between items-center text-sm">
                                            <span>İstek (Request Payload)</span>
                                        </div>
                                        <div className="flex-1 p-3 overflow-y-auto bg-gray-800 text-green-400 font-mono text-xs whitespace-pre-wrap">
                                            {selectedLog.requestPayload ? JSON.stringify(selectedLog.requestPayload, null, 2) : 'Payload Yok'}
                                        </div>
                                    </div>

                                    <div className="flex flex-col h-full border rounded">
                                        <div className="bg-gray-100 px-3 py-2 border-b font-medium text-gray-700 flex justify-between items-center text-sm">
                                            <span>Yanıt (Response Payload)</span>
                                            {selectedLog.responseStatus && (
                                                <span className={`px-2 py-0.5 rounded text-xs text-white ${selectedLog.responseStatus >= 200 && selectedLog.responseStatus < 300 ? 'bg-green-500' : 'bg-red-500'}`}>
                                                    Status: {selectedLog.responseStatus}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 p-3 overflow-y-auto bg-gray-800 text-yellow-300 font-mono text-xs whitespace-pre-wrap">
                                            {selectedLog.responsePayload ? JSON.stringify(selectedLog.responsePayload, null, 2) : 'Yanıt Yok'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 text-right">
                                <button
                                    type="button"
                                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:text-sm"
                                    onClick={() => setSelectedLog(null)}
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegrationLogsPage;

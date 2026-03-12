'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChatInterface, type Message } from '@/components/chat-interface';
import { startCustomerPractice, sendCustomerMessage, quitCustomerPractice } from '@/lib/api';
import type { VirtualCustomer } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, LogOut, Loader2, CheckCircle2, Package, ShoppingCart, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';

const moodEmoji: Record<string, string> = {
  '开心': '😊', '高兴': '😊', '焦虑': '😰', '紧张': '😰',
  '愤怒': '😠', '生气': '😠', '平静': '😐', '冷静': '😐',
  '失望': '😞', '沮丧': '😞', '着急': '😰', '不满': '😠',
  '困惑': '🤔', '担忧': '😟',
};

function getMoodEmoji(mood: string): string {
  for (const [key, emoji] of Object.entries(moodEmoji)) {
    if (mood.includes(key)) return emoji;
  }
  return '😐';
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<Partial<VirtualCustomer> | null>(null);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [finished, setFinished] = useState(false);
  const [finishStatus, setFinishStatus] = useState('');
  const [round, setRound] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const startRes = await startCustomerPractice(customerId);
    if (startRes.success && startRes.data) {
      setRecordId(startRes.data.record_id);
      setCustomer(startRes.data.customer);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `你好，我是${startRes.data.customer?.name || '顾客'}。${startRes.data.customer?.question || customer?.demand || '我有个问题想咨询。'}`,
      }]);
    } else {
      toast.error(startRes.error || '开始对练失败');
      router.back();
    }
    setInitializing(false);
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!recordId || round >= 200 || finished) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setRound(prev => prev + 1);

      const res = await sendCustomerMessage(customerId, recordId, text);
      if (res.success && res.data) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.data.message,
          feedback: res.data.feedback,
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (res.data.finished) {
          setFinished(true);
          setFinishStatus(res.data.status);
          if (res.data.status === 'completed') {
            toast.success('顾客问题已解决！');
          } else if (res.data.status === 'failed') {
            toast.error('顾客已失望离开');
          }
        }
      } else {
        toast.error(res.error || '发送失败');
      }
      setLoading(false);
    },
    [recordId, round, finished, customerId]
  );

  const handleQuit = async () => {
    if (recordId) {
      await quitCustomerPractice(customerId, recordId);
    }
    router.push('/customers');
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">正在连接顾客...</p>
        </div>
      </div>
    );
  }

  const emoji = customer?.mood ? getMoodEmoji(customer.mood) : '😐';

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 h-14 border-b bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={handleQuit}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{customer?.name}</span>
              <span className="text-base">{emoji}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {customer?.question || customer?.demand}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">第 {round} 轮</span>
          <Button variant="outline" size="sm" onClick={handleQuit}>
            <LogOut className="h-3.5 w-3.5 mr-1" />
            关闭
          </Button>
        </div>
      </div>

      {finishStatus === 'completed' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">顾客问题已成功解决！</span>
        </div>
      )}

      {finishStatus === 'failed' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-2">
          <span className="text-sm text-red-700 font-medium">😞 顾客已失望离开</span>
        </div>
      )}

      {round >= 200 && !finished && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-2">
          <span className="text-sm text-amber-700">已达到最大对话轮数（200轮）</span>
        </div>
      )}

      {/* 售前商品信息 */}
      {customer?.virtual_product && customer.scene_type === 'pre_sale' && (
        <div className="border-b bg-blue-50/50 shrink-0">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-blue-700 hover:bg-blue-50"
          >
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              咨询商品信息
            </span>
            {showInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
          </button>
          {showInfo && (
            <div className="px-4 pb-3 text-xs space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="text-muted-foreground">商品名称：</span>{customer.virtual_product.spu_name || customer.virtual_product.name}</div>
                <div><span className="text-muted-foreground">类型：</span>{customer.virtual_product.category || '-'}</div>
                <div><span className="text-muted-foreground">价格：</span>{customer.virtual_product.price}</div>
              </div>
              {customer.virtual_product.skus?.length > 0 && (
                <div>
                  <span className="text-muted-foreground">可选规格：</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {customer.virtual_product.skus.map((sku: any, i: number) => (
                      <span key={i} className="inline-flex items-center rounded bg-white px-2 py-0.5 border text-xs">
                        {sku.sku_name} {sku.sku_price} <span className={`ml-1 ${sku.stock === '缺货' ? 'text-red-500' : 'text-green-600'}`}>{sku.stock}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 售后订单信息 */}
      {customer?.virtual_order && customer.scene_type === 'after_sale' && (
        <div className="border-b bg-orange-50/50 shrink-0">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-orange-700 hover:bg-orange-50"
          >
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              订单信息
            </span>
            {showInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
          </button>
          {showInfo && (
            <div className="px-4 pb-3 text-xs space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="text-muted-foreground">订单号：</span>{customer.virtual_order.order_id}</div>
                <div><span className="text-muted-foreground">订单金额：</span>{customer.virtual_order.order_amount}</div>
                <div><span className="text-muted-foreground">下单时间：</span>{customer.virtual_order.order_time || customer.virtual_order.date || '-'}</div>
                <div><span className="text-muted-foreground">发货时间：</span>{customer.virtual_order.ship_time || '未发货'}</div>
                <div><span className="text-muted-foreground">订单状态：</span><span className="font-medium">{customer.virtual_order.order_status || customer.virtual_order.status}</span></div>
                <div><span className="text-muted-foreground">物流状态：</span>{customer.virtual_order.logistics_status || '-'}</div>
                {customer.virtual_order.logistics_time && (
                  <div className="col-span-2"><span className="text-muted-foreground">物流更新：</span>{customer.virtual_order.logistics_time}</div>
                )}
              </div>
              {customer.virtual_order.items?.length > 0 && (
                <div>
                  <span className="text-muted-foreground">商品列表：</span>
                  <div className="mt-1 space-y-1">
                    {customer.virtual_order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 rounded bg-white px-2 py-1 border text-xs">
                        <span className="flex-1">{item.name}</span>
                        {item.spec && <span className="text-muted-foreground">{item.spec}</span>}
                        {item.category && <span className="text-muted-foreground">{item.category}</span>}
                        <span>{item.price}</span>
                        <span className="text-muted-foreground">×{item.quantity || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ChatInterface
        messages={messages}
        onSend={handleSend}
        loading={loading}
        disabled={finished || round >= 200}
        placeholder={finished ? '对练已结束' : '输入你的回复...'}
        className="flex-1 min-h-0"
      />
    </div>
  );
}

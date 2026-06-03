import { User, SubscriptionPlan, Product, MarketplaceIntegration } from '../models';

const FREE_TIER_LIMIT = 5;

interface AIAccessResult {
  allowed: boolean;
  remaining: number;
  monthlyRemaining: number;
  balanceRemaining: number;
  message: string;
}

interface CreditBalance {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  purchasedBalance: number;
  totalRemaining: number;
}

class PlanAccessService {
  async getUserPlan(userId: string): Promise<{ plan: SubscriptionPlan | null; user: User }> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    let plan: SubscriptionPlan | null = null;
    if (user.subscriptionPlan) {
      plan = await SubscriptionPlan.findOne({ where: { name: user.subscriptionPlan, isActive: true } });
    }
    return { plan, user };
  }

  async checkProductLimit(userId: string, storeId: string): Promise<{ allowed: boolean; limit: number; current: number; message: string }> {
    const { plan } = await this.getUserPlan(userId);
    const limit = plan ? plan.productLimit : FREE_TIER_LIMIT;
    const current = await Product.count({ where: { storeId } });
    const allowed = current < limit;
    return {
      allowed,
      limit,
      current,
      message: allowed ? '' : `Paket limitinize ulaştınız. Mevcut paketiniz maksimum ${limit} ürün izni vermektedir.`
    };
  }

  async checkIntegrationLimit(userId: string): Promise<{ allowed: boolean; limit: number; current: number; message: string }> {
    const { plan } = await this.getUserPlan(userId);
    const limit = plan ? plan.integrationLimit : 1;
    const current = await MarketplaceIntegration.count({ where: { userId } });
    const allowed = current < limit;
    return {
      allowed,
      limit,
      current,
      message: allowed ? '' : `Entegrasyon limitinize (Maksimum: ${limit}) ulaştınız.`
    };
  }

  async resetMonthlyCreditsIfNeeded(user: User): Promise<void> {
    const now = new Date();
    if (!user.aiCreditsLastResetAt || this.isNewMonth(user.aiCreditsLastResetAt, now)) {
      user.aiCreditsUsedThisMonth = 0;
      user.aiCreditsLastResetAt = now;
      await user.save();
    }
  }

  private isNewMonth(last: Date, now: Date): boolean {
    return last.getFullYear() < now.getFullYear() ||
           (last.getFullYear() === now.getFullYear() && last.getMonth() < now.getMonth());
  }

  async checkAIAccess(userId: string, requiredCredits: number = 1): Promise<AIAccessResult> {
    const { plan, user } = await this.getUserPlan(userId);

    const translationEnabled = plan?.aiTranslationEnabled || false;
    const contentEnabled = plan?.aiContentEnabled || false;
    const monthlyLimit = plan?.aiMonthlyCredit || 0;

    if (!translationEnabled && !contentEnabled) {
      return {
        allowed: false, remaining: 0, monthlyRemaining: 0, balanceRemaining: 0,
        message: 'Paketiniz AI özelliklerini desteklemiyor. Paketinizi yükseltmek için abonelik sayfasını ziyaret edin.'
      };
    }

    await this.resetMonthlyCreditsIfNeeded(user);

    const monthlyUsed = user.aiCreditsUsedThisMonth || 0;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);
    const balanceRemaining = user.aiCreditBalance || 0;

    if (monthlyRemaining + balanceRemaining < requiredCredits) {
      return {
        allowed: false,
        remaining: monthlyRemaining + balanceRemaining,
        monthlyRemaining,
        balanceRemaining,
        message: `AI krediniz yetersiz. Kalan: ${monthlyRemaining + balanceRemaining}. Kredi yüklemek için kredi sayfasını ziyaret edin.`
      };
    }

    return {
      allowed: true,
      remaining: monthlyRemaining + balanceRemaining,
      monthlyRemaining,
      balanceRemaining,
      message: ''
    };
  }

  async deductCredits(userId: string, amount: number): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    await this.resetMonthlyCreditsIfNeeded(user);

    let remaining = amount;
    const monthlyLimit = user.aiCreditsUsedThisMonth !== undefined ? user.aiCreditsUsedThisMonth : 0;

    // Deduct from monthly allowance first
    const plan = user.subscriptionPlan
      ? await SubscriptionPlan.findOne({ where: { name: user.subscriptionPlan } })
      : null;
    const monthlyMax = plan?.aiMonthlyCredit || 0;
    const monthlyAvailable = Math.max(0, monthlyMax - monthlyLimit);

    if (monthlyAvailable > 0) {
      const fromMonthly = Math.min(remaining, monthlyAvailable);
      user.aiCreditsUsedThisMonth = (user.aiCreditsUsedThisMonth || 0) + fromMonthly;
      remaining -= fromMonthly;
    }

    // Then from purchased balance
    if (remaining > 0) {
      user.aiCreditBalance = Math.max(0, (user.aiCreditBalance || 0) - remaining);
    }

    await user.save();
  }

  async getCreditBalance(userId: string): Promise<CreditBalance> {
    const { plan, user } = await this.getUserPlan(userId);
    await this.resetMonthlyCreditsIfNeeded(user);

    const monthlyLimit = plan?.aiMonthlyCredit || 0;
    const monthlyUsed = user.aiCreditsUsedThisMonth || 0;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);
    const purchasedBalance = user.aiCreditBalance || 0;

    return {
      monthlyLimit,
      monthlyUsed,
      monthlyRemaining,
      purchasedBalance,
      totalRemaining: monthlyRemaining + purchasedBalance
    };
  }

  async addPurchasedCredits(userId: string, credits: number): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    user.aiCreditBalance = (user.aiCreditBalance || 0) + credits;
    await user.save();
  }
}

export default new PlanAccessService();

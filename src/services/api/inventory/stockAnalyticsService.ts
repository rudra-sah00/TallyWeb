export interface StockItem {
  name: string;
  closingBalance: string;
  closingValue: string;
  openingBalance: string;
  openingValue: string;
  baseUnits: string;
}

export interface ValueDistribution {
  range: string;
  count: number;
  minValue: number;
  maxValue: number;
}

export interface UnitDistribution {
  unit: string;
  count: number;
}

export interface StockMovement {
  increased: number;
  decreased: number;
  noChange: number;
}

export interface AnalysisMetadata {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  totalProcessed: number;
  totalTopValue: number;
  totalLowStock: number;
  totalZeroStock: number;
  highValueThreshold: number;
  lowStockThreshold: number;
  processingTime: number;
  lastAnalyzed: string;
}

export interface StockAnalytics {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  topValueItems: StockItem[];
  lowStockItems: StockItem[];
  zeroStockItems: StockItem[];
  valueDistribution: ValueDistribution[];
  itemsByUnit: UnitDistribution[];
  stockMovement: StockMovement;
  analysisMetadata?: AnalysisMetadata;
}

class StockAnalyticsService {
  private readonly HIGH_VALUE_THRESHOLD = 50000; // ₹50K threshold for top values
  
  private parseNumericValue(value: string): number {
    try {
      // Remove currency symbols, commas, and other non-numeric characters except decimal points and minus signs
      const cleanValue = value.replace(/[^\d.-]/g, '');
      const numericValue = parseFloat(cleanValue);
      return isNaN(numericValue) ? 0 : Math.abs(numericValue);
    } catch (error) {
      console.warn(`Failed to parse numeric value: "${value}"`, error);
      return 0;
    }
  }

  private calculateDynamicLowStockThreshold(items: StockItem[]): number {
    const balances = items
      .map(item => this.parseNumericValue(item.closingBalance))
      .filter(balance => balance > 0)
      .sort((a, b) => a - b);
    
    if (balances.length === 0) return 10; // Default threshold
    
    const q1Index = Math.floor(balances.length * 0.25);
    const q1 = balances[q1Index] || 10;
    
    // Use 25th percentile as dynamic threshold, with minimum of 5 and maximum of 50
    return Math.max(5, Math.min(50, q1));
  }

  generateAnalytics(stockItems: StockItem[]): StockAnalytics {
    const startTime = Date.now();
    
    if (!stockItems || stockItems.length === 0) {
      console.warn('⚠️ No stock items provided for analytics');
      return this.getEmptyAnalytics();
    }

    try {
      // Calculate dynamic thresholds
      const lowStockThreshold = this.calculateDynamicLowStockThreshold(stockItems);
      
      // Process all items without any limits
      const allProcessedItems = stockItems.map(item => {
        const closingBalance = this.parseNumericValue(item.closingBalance);
        const closingValue = this.parseNumericValue(item.closingValue);
        const openingValue = this.parseNumericValue(item.openingValue);
        const maxValue = Math.max(closingValue, openingValue);
        
        return {
          ...item,
          parsedClosingBalance: closingBalance,
          parsedClosingValue: closingValue,
          parsedOpeningValue: openingValue,
          maxValue: maxValue
        };
      });

      // TOP VALUE ITEMS: All items above ₹50K threshold (NO LIMITS)
      const highValueItems = allProcessedItems
        .filter(item => item.maxValue >= this.HIGH_VALUE_THRESHOLD)
        .sort((a, b) => b.maxValue - a.maxValue)
        .map(item => ({
          name: item.name,
          closingBalance: item.closingBalance,
          closingValue: item.closingValue,
          openingBalance: item.openingBalance,
          openingValue: item.openingValue,
          baseUnits: item.baseUnits
        }));

      // LOW STOCK ITEMS: All items with low stock (NO LIMITS)
      const lowStockItems = allProcessedItems
        .filter(item => item.parsedClosingBalance > 0 && item.parsedClosingBalance <= lowStockThreshold)
        .sort((a, b) => a.parsedClosingBalance - b.parsedClosingBalance)
        .map(item => ({
          name: item.name,
          closingBalance: item.closingBalance,
          closingValue: item.closingValue,
          openingBalance: item.openingBalance,
          openingValue: item.openingValue,
          baseUnits: item.baseUnits
        }));

      // ZERO STOCK ITEMS: All items with zero stock (NO LIMITS)
      const zeroStockItems = allProcessedItems
        .filter(item => item.parsedClosingBalance === 0)
        .sort((a, b) => b.parsedOpeningValue - a.parsedOpeningValue)
        .map(item => ({
          name: item.name,
          closingBalance: item.closingBalance,
          closingValue: item.closingValue,
          openingBalance: item.openingBalance,
          openingValue: item.openingValue,
          baseUnits: item.baseUnits
        }));

      // Calculate total metrics
      const totalValue = allProcessedItems.reduce((sum, item) => sum + item.maxValue, 0);
      const averageValue = stockItems.length > 0 ? totalValue / stockItems.length : 0;

      // Value distribution analysis
      const valueDistribution = this.calculateValueDistribution(allProcessedItems);

      // Unit distribution analysis (top 10 units)
      const unitCounts = new Map<string, number>();
      stockItems.forEach(item => {
        const unit = item.baseUnits || 'Unknown';
        unitCounts.set(unit, (unitCounts.get(unit) || 0) + 1);
      });

      const itemsByUnit = Array.from(unitCounts.entries())
        .map(([unit, count]) => ({ unit, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Only top 10 units for chart readability

      // Stock movement analysis
      const stockMovement = this.calculateStockMovement(allProcessedItems);

      const processingTime = Date.now() - startTime;
      
      const analytics: StockAnalytics = {
        totalItems: stockItems.length,
        totalValue,
        averageValue,
        topValueItems: highValueItems,
        lowStockItems: lowStockItems,
        zeroStockItems: zeroStockItems,
        valueDistribution,
        itemsByUnit,
        stockMovement,
        analysisMetadata: {
          totalItems: stockItems.length,
          totalValue,
          averageValue,
          totalProcessed: stockItems.length,
          totalTopValue: highValueItems.length,
          totalLowStock: lowStockItems.length,
          totalZeroStock: zeroStockItems.length,
          highValueThreshold: this.HIGH_VALUE_THRESHOLD,
          lowStockThreshold,
          processingTime,
          lastAnalyzed: new Date().toISOString()
        }
      };

      return analytics;
    } catch (error) {
      console.error('❌ Error in analytics generation:', error);
      return this.getEmptyAnalytics();
    }
  }

  private calculateValueDistribution(items: any[]): ValueDistribution[] {
    const ranges = [
      { range: '₹0-1K', min: 0, max: 1000 },
      { range: '₹1K-5K', min: 1000, max: 5000 },
      { range: '₹5K-10K', min: 5000, max: 10000 },
      { range: '₹10K-25K', min: 10000, max: 25000 },
      { range: '₹25K-50K', min: 25000, max: 50000 },
      { range: '₹50K-1L', min: 50000, max: 100000 },
      { range: '₹1L-5L', min: 100000, max: 500000 },
      { range: '₹5L+', min: 500000, max: Infinity }
    ];

    return ranges.map(range => {
      const count = items.filter(item => 
        item.maxValue >= range.min && item.maxValue < range.max
      ).length;
      
      return {
        range: range.range,
        count,
        minValue: range.min,
        maxValue: range.max === Infinity ? Number.MAX_SAFE_INTEGER : range.max
      };
    }).filter(range => range.count > 0);
  }

  private calculateStockMovement(items: any[]): StockMovement {
    let increased = 0;
    let decreased = 0;
    let noChange = 0;

    items.forEach(item => {
      const closingBalance = item.parsedClosingBalance;
      const openingBalance = this.parseNumericValue(item.openingBalance);
      
      if (closingBalance > openingBalance) {
        increased++;
      } else if (closingBalance < openingBalance) {
        decreased++;
      } else {
        noChange++;
      }
    });

    return { increased, decreased, noChange };
  }

  private getEmptyAnalytics(): StockAnalytics {
    return {
      totalItems: 0,
      totalValue: 0,
      averageValue: 0,
      topValueItems: [],
      lowStockItems: [],
      zeroStockItems: [],
      valueDistribution: [],
      itemsByUnit: [],
      stockMovement: { increased: 0, decreased: 0, noChange: 0 },
      analysisMetadata: {
        totalItems: 0,
        totalValue: 0,
        averageValue: 0,
        totalProcessed: 0,
        totalTopValue: 0,
        totalLowStock: 0,
        totalZeroStock: 0,
        highValueThreshold: this.HIGH_VALUE_THRESHOLD,
        lowStockThreshold: 10,
        processingTime: 0,
        lastAnalyzed: new Date().toISOString()
      }
    };
  }
}

export const stockAnalyticsService = new StockAnalyticsService();

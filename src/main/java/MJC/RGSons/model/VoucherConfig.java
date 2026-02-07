package MJC.RGSons.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "voucher_config")
public class VoucherConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer configId;

    @Column(nullable = false, unique = true)
    private String voucherType; // 'PURCHASE', 'SALE', 'STOCK_TRANSFER_OUT', 'STOCK_TRANSFER_IN'

    private String prefix;
    private Boolean includeStoreCode = true;
    private Integer storeCodePosition; // 1=after prefix, 2=after date, 3=before number
    private Boolean includeYear = true;
    private String yearFormat; // 'YYYY', 'YY'
    private Boolean includeMonth = false;
    private String monthFormat; // 'MM', 'M'
    private Boolean includeDay = false;
    private String dayFormat; // 'DD', 'D'
    private String separator = "-";
    private Integer numberPadding = 4;
    private String suffix;
    private String resetFrequency; // 'NEVER', 'DAILY', 'MONTHLY', 'YEARLY'
    private String numberingScope; // 'GLOBAL', 'STORE_WISE'
    @Column(name = "pricing_method")
    private String pricingMethod;
    private Boolean isActive = true;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Integer getConfigId() { return configId; }
    public void setConfigId(Integer configId) { this.configId = configId; }

    public String getVoucherType() { return voucherType; }
    public void setVoucherType(String voucherType) { this.voucherType = voucherType; }

    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }

    public Boolean getIncludeStoreCode() { return includeStoreCode; }
    public void setIncludeStoreCode(Boolean includeStoreCode) { this.includeStoreCode = includeStoreCode; }

    public Integer getStoreCodePosition() { return storeCodePosition; }
    public void setStoreCodePosition(Integer storeCodePosition) { this.storeCodePosition = storeCodePosition; }

    public Boolean getIncludeYear() { return includeYear; }
    public void setIncludeYear(Boolean includeYear) { this.includeYear = includeYear; }

    public String getYearFormat() { return yearFormat; }
    public void setYearFormat(String yearFormat) { this.yearFormat = yearFormat; }

    public Boolean getIncludeMonth() { return includeMonth; }
    public void setIncludeMonth(Boolean includeMonth) { this.includeMonth = includeMonth; }

    public String getMonthFormat() { return monthFormat; }
    public void setMonthFormat(String monthFormat) { this.monthFormat = monthFormat; }

    public Boolean getIncludeDay() { return includeDay; }
    public void setIncludeDay(Boolean includeDay) { this.includeDay = includeDay; }

    public String getDayFormat() { return dayFormat; }
    public void setDayFormat(String dayFormat) { this.dayFormat = dayFormat; }

    public String getSeparator() { return separator; }
    public void setSeparator(String separator) { this.separator = separator; }

    public Integer getNumberPadding() { return numberPadding; }
    public void setNumberPadding(Integer numberPadding) { this.numberPadding = numberPadding; }

    public String getSuffix() { return suffix; }
    public void setSuffix(String suffix) { this.suffix = suffix; }

    public String getResetFrequency() { return resetFrequency; }
    public void setResetFrequency(String resetFrequency) { this.resetFrequency = resetFrequency; }

    public String getNumberingScope() { return numberingScope; }
    public void setNumberingScope(String numberingScope) { this.numberingScope = numberingScope; }

    public String getPricingMethod() { return pricingMethod; }
    public void setPricingMethod(String pricingMethod) { this.pricingMethod = pricingMethod; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

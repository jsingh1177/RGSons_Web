package MJC.RGSons.dto;

public class DsrStatusDTO {
    private String districtName;
    private String shopType;
    private String storeStatus;
    private String owner;
    private String info3;
    private String storeCode;
    private String storeName;
    private String date;
    private Integer status;
    private java.math.BigDecimal saleAmount;

    public DsrStatusDTO(String districtName, String shopType, String storeStatus, String owner, String info3, String storeCode, String storeName, String date, Integer status) {
        this.districtName = districtName;
        this.shopType = shopType;
        this.storeStatus = storeStatus;
        this.owner = owner;
        this.info3 = info3;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.status = status;
    }

    public DsrStatusDTO(String districtName, String shopType, String storeStatus, String owner, String info3, String storeCode, String storeName, String date, java.math.BigDecimal saleAmount) {
        this.districtName = districtName;
        this.shopType = shopType;
        this.storeStatus = storeStatus;
        this.owner = owner;
        this.info3 = info3;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.saleAmount = saleAmount;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
    }

    public String getShopType() {
        return shopType;
    }

    public void setShopType(String shopType) {
        this.shopType = shopType;
    }

    public String getStoreStatus() {
        return storeStatus;
    }

    public void setStoreStatus(String storeStatus) {
        this.storeStatus = storeStatus;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getInfo3() {
        return info3;
    }

    public void setInfo3(String info3) {
        this.info3 = info3;
    }

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public java.math.BigDecimal getSaleAmount() {
        return saleAmount;
    }

    public void setSaleAmount(java.math.BigDecimal saleAmount) {
        this.saleAmount = saleAmount;
    }
}

package MJC.RGSons.dto;

public class DsrStatusDTO {
    private String districtName;
    private String storeCode;
    private String storeName;
    private String date;
    private Integer status;

    public DsrStatusDTO(String districtName, String storeCode, String storeName, String date, Integer status) {
        this.districtName = districtName;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.status = status;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
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
}


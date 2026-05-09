package MJC.RGSons.dto;

public class DayWiseSalesDTO {
    private String date;
    private Double totalSales;

    public DayWiseSalesDTO(String date, Double totalSales) {
        this.date = date;
        this.totalSales = totalSales;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public Double getTotalSales() {
        return totalSales;
    }

    public void setTotalSales(Double totalSales) {
        this.totalSales = totalSales;
    }
}

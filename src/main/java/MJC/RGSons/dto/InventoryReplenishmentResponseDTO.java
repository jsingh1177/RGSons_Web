package MJC.RGSons.dto;

import java.util.ArrayList;
import java.util.List;

public class InventoryReplenishmentResponseDTO {
    private List<InventoryReplenishmentRowDTO> rows = new ArrayList<>();
    private InventoryReplenishmentSummaryDTO summary = new InventoryReplenishmentSummaryDTO();
    private long totalRows;
    private int page;
    private int size;
    private String sortBy;
    private String sortDir;

    public List<InventoryReplenishmentRowDTO> getRows() {
        return rows;
    }

    public void setRows(List<InventoryReplenishmentRowDTO> rows) {
        this.rows = rows;
    }

    public InventoryReplenishmentSummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(InventoryReplenishmentSummaryDTO summary) {
        this.summary = summary;
    }

    public long getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(long totalRows) {
        this.totalRows = totalRows;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public String getSortBy() {
        return sortBy;
    }

    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }

    public String getSortDir() {
        return sortDir;
    }

    public void setSortDir(String sortDir) {
        this.sortDir = sortDir;
    }
}

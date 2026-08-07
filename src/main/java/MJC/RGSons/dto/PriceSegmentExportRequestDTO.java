package MJC.RGSons.dto;

import java.util.List;

public class PriceSegmentExportRequestDTO {
    private List<String> columns;
    private List<PriceSegmentExportRowDTO> rows;

    public PriceSegmentExportRequestDTO() {
    }

    public List<String> getColumns() {
        return columns;
    }

    public void setColumns(List<String> columns) {
        this.columns = columns;
    }

    public List<PriceSegmentExportRowDTO> getRows() {
        return rows;
    }

    public void setRows(List<PriceSegmentExportRowDTO> rows) {
        this.rows = rows;
    }
}


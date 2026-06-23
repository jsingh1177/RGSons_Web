package MJC.RGSons.repository;

import MJC.RGSons.model.ReportColumnMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportColumnMappingRepository extends JpaRepository<ReportColumnMapping, Integer> {
    List<ReportColumnMapping> findByReportIdOrderBySortOrderAscIdAsc(Integer reportId);
    List<ReportColumnMapping> findByReportIdAndVisibleTrueOrderBySortOrderAscIdAsc(Integer reportId);
    boolean existsByReportIdAndColumnNameIgnoreCase(Integer reportId, String columnName);
}

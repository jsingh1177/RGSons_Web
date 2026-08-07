package MJC.RGSons.repository;

import MJC.RGSons.model.MerchandiseHierarchy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchandiseHierarchyRepository extends JpaRepository<MerchandiseHierarchy, Integer> {

    List<MerchandiseHierarchy> findAllByOrderByNodeLevelAscSortOrderAscNodeNameAsc();

    Optional<MerchandiseHierarchy> findByNodeCode(String nodeCode);

    boolean existsByNodeCode(String nodeCode);

    long countByParentId(Integer parentId);

    @Query("""
            SELECT COUNT(m) FROM MerchandiseHierarchy m
            WHERE ((:parentId IS NULL AND m.parentId IS NULL) OR m.parentId = :parentId)
              AND LOWER(m.nodeName) = LOWER(:nodeName)
            """)
    long countSiblingName(@Param("parentId") Integer parentId, @Param("nodeName") String nodeName);

    @Query("""
            SELECT COUNT(m) FROM MerchandiseHierarchy m
            WHERE ((:parentId IS NULL AND m.parentId IS NULL) OR m.parentId = :parentId)
              AND LOWER(m.nodeName) = LOWER(:nodeName)
              AND m.id <> :id
            """)
    long countSiblingNameExcludingId(@Param("parentId") Integer parentId,
                                     @Param("nodeName") String nodeName,
                                     @Param("id") Integer id);

    @Query("""
            SELECT COUNT(m) FROM MerchandiseHierarchy m
            WHERE LOWER(m.nodeCode) = LOWER(:nodeCode)
              AND m.id <> :id
            """)
    long countNodeCodeExcludingId(@Param("nodeCode") String nodeCode, @Param("id") Integer id);
}

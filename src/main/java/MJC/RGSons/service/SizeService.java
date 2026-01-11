package MJC.RGSons.service;

import MJC.RGSons.model.Size;
import MJC.RGSons.repository.SizeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SizeService {
    
    @Autowired
    private SizeRepository sizeRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;
    
    public List<Size> getAllSizes() {
        return sizeRepository.findAll();
    }
    
    public Optional<Size> getSizeById(String id) {
        return sizeRepository.findById(id);
    }
    
    public Optional<Size> getSizeByCode(String code) {
        return sizeRepository.findByCode(code);
    }
    
    public List<Size> getActiveSizes() {
        return sizeRepository.findByStatusOrderByNameAsc(true);
    }
    
    public List<Size> getSizesByStatus(Boolean status) {
        return sizeRepository.findByStatus(status);
    }
    
    public void validateSize(Size size) {
        // Code validation removed as it is auto-generated
        /*
        if (size.getCode() == null || size.getCode().trim().isEmpty()) {
            throw new RuntimeException("Size code is required");
        }
        */
        if (size.getName() == null || size.getName().trim().isEmpty()) {
            throw new RuntimeException("Size name is required");
        }
    }
// Create a new size
    public Size createSize(Size size) {
        // Generate Size Code from Sequence
        size.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        // Trim name
        size.setName(size.getName().trim());

        // Check if size name already exists
        if (sizeRepository.existsByNameIgnoreCase(size.getName())) {
            throw new RuntimeException("Size name already exists: " + size.getName());
        }

        // Check if size code already exists
        if (sizeRepository.existsByCode(size.getCode())) {
            throw new RuntimeException("Size code already exists: " + size.getCode());
        }
        
        if (size.getStatus() == null) {
            size.setStatus(true);
        }
        size.setCreatedAt(LocalDateTime.now());
        size.setUpdateAt(LocalDateTime.now());
        
        return sizeRepository.save(size);
    }
    
    public Size updateSize(String id, Size sizeDetails) {
        Optional<Size> optionalSize = sizeRepository.findById(id);
        if (optionalSize.isPresent()) {
            Size existingSize = optionalSize.get();
            
            // Trim name
            sizeDetails.setName(sizeDetails.getName().trim());

            // Check if size name is being changed and if it already exists
            if (!existingSize.getName().equalsIgnoreCase(sizeDetails.getName()) &&
                sizeRepository.existsByNameIgnoreCase(sizeDetails.getName())) {
                throw new RuntimeException("Size name already exists: " + sizeDetails.getName());
            }
            
            // Update fields
            // Code is non-editable
            // existingSize.setCode(sizeDetails.getCode());
            existingSize.setName(sizeDetails.getName());
            if (sizeDetails.getStatus() != null) {
                existingSize.setStatus(sizeDetails.getStatus());
            }
            existingSize.setUpdateAt(LocalDateTime.now());
            
            return sizeRepository.save(existingSize);
        } else {
            throw new RuntimeException("Size not found with id: " + id);
        }
    }
    
    public void deleteSizeById(String id) {
        // Soft delete implementation as per controller comment
        Optional<Size> optionalSize = sizeRepository.findById(id);
        if (optionalSize.isPresent()) {
            Size size = optionalSize.get();
            size.setStatus(false);
            size.setUpdateAt(LocalDateTime.now());
            sizeRepository.save(size);
        } else {
            throw new RuntimeException("Size not found with id: " + id);
        }
    }
    
    public void hardDeleteSizeById(String id) {
        if (sizeRepository.existsById(id)) {
            sizeRepository.deleteById(id);
        } else {
            throw new RuntimeException("Size not found with id: " + id);
        }
    }
    
    public boolean existsByCode(String code) {
        return sizeRepository.existsByCode(code);
    }
    
    public List<Size> searchSizesByName(String name) {
        return sizeRepository.findByNameContainingIgnoreCase(name);
    }
    
    public long getSizeCountByStatus(Boolean status) {
        return sizeRepository.countByStatus(status);
    }
    
    public long getActiveSizeCount() {
        return sizeRepository.countByStatus(true);
    }
    
    public Size toggleSizeStatus(String id) {
        Optional<Size> optionalSize = sizeRepository.findById(id);
        if (optionalSize.isPresent()) {
            Size size = optionalSize.get();
            size.setStatus(!size.getStatus());
            size.setUpdateAt(LocalDateTime.now());
            return sizeRepository.save(size);
        } else {
            throw new RuntimeException("Size not found with id: " + id);
        }
    }
    
    public List<Size> searchSizes(String name, Boolean status) {
        return sizeRepository.findByNameContainingIgnoreCaseAndStatus(name, status);
    }
    
    public List<Size> getSizesCreatedAfter(LocalDateTime date) {
        return sizeRepository.findByCreatedAtAfter(date);
    }

    public void updateSizeOrder(List<String> sizeIds) {
        for (int i = 0; i < sizeIds.size(); i++) {
            String id = sizeIds.get(i);
            Optional<Size> optionalSize = sizeRepository.findById(id);
            if (optionalSize.isPresent()) {
                Size size = optionalSize.get();
                size.setShortOrder(i + 1); // 1-based index
                size.setUpdateAt(LocalDateTime.now());
                sizeRepository.save(size);
            }
        }
    }
}
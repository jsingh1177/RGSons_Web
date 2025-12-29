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
    
    public List<Size> getAllSizes() {
        return sizeRepository.findAll();
    }
    
    public Optional<Size> getSizeById(Long id) {
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
        if (size.getCode() == null || size.getCode().trim().isEmpty()) {
            throw new RuntimeException("Size code is required");
        }
        if (size.getName() == null || size.getName().trim().isEmpty()) {
            throw new RuntimeException("Size name is required");
        }
    }
    
    public Size createSize(Size size) {
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
    
    public Size updateSize(Long id, Size sizeDetails) {
        Optional<Size> optionalSize = sizeRepository.findById(id);
        if (optionalSize.isPresent()) {
            Size existingSize = optionalSize.get();
            
            // Check if code is changing and if it exists
            if (!existingSize.getCode().equals(sizeDetails.getCode()) && 
                sizeRepository.existsByCode(sizeDetails.getCode())) {
                throw new RuntimeException("Size code already exists: " + sizeDetails.getCode());
            }
            
            existingSize.setCode(sizeDetails.getCode());
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
    
    public void deleteSizeById(Long id) {
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
    
    public void hardDeleteSizeById(Long id) {
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
    
    public Size toggleSizeStatus(Long id) {
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
        return sizeRepository.findByNameAndStatus(name, status);
    }
    
    public List<Size> getSizesCreatedAfter(LocalDateTime date) {
        return sizeRepository.findByCreatedAtAfter(date);
    }
}
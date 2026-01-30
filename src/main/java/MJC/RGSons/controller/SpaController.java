package MJC.RGSons.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Match everything without a suffix (so not static resources)
    // and not starting with /api
    @RequestMapping(value = "/{path:[^\\.]*}")
    public String redirect() {
        // Forward to index.html so React Router can handle it
        return "forward:/index.html";
    }
    
    // Also handle nested paths if necessary, but typically the above covers single level.
    // For nested levels like /users/edit/1, we might need a more comprehensive regex
    // or just catch all.
    
    // Catch-all for single level and multi-level paths that are not API calls
    // Excluding /api/** and files with extensions
    @RequestMapping(value = "/**/{path:[^\\.]*}")
    public String forward() {
        return "forward:/index.html";
    }
}

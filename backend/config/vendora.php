<?php

return [

    /*
    | Largest upload the API accepts (receipts, bank statements), in kilobytes. The Docker entrypoint derives
    | PHP's upload_max_filesize/post_max_size from this. The SPA still checks receipts against its own 5 MB constant
    | (transactions.component.ts), so raise that too if you raise this above 5120.
    */
    'max_upload_kb' => (int) env('MAX_UPLOAD_KB', 5120),

];

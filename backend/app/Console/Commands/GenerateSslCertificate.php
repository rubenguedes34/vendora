<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:generate-ssl-certificate')]
#[Description('Generate self-signed SSL certificate for local development')]
class GenerateSslCertificate extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $certPath = base_path('storage/certificates');
        
        if (!is_dir($certPath)) {
            mkdir($certPath, 0755, true);
        }

        $keyFile = $certPath . '/server.key';
        $certFile = $certPath . '/server.crt';
        $configFile = $certPath . '/openssl.cnf';

        $this->info('Generating self-signed SSL certificate...');

        // Create OpenSSL config file
        $config = "
[req]
default_bits = 2048
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = PT
ST = Lisbon
L = Lisbon
O = Vendora
OU = Development
CN = localhost
emailAddress = admin@vendora.com

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
";

        file_put_contents($configFile, $config);

        // Generate certificate using OpenSSL command
        $command = "openssl req -x509 -newkey rsa:2048 -keyout {$keyFile} -out {$certFile} -days 365 -nodes -config {$configFile} 2>&1";
        
        $output = shell_exec($command);

        if (file_exists($certFile) && file_exists($keyFile)) {
            $this->info('SSL certificate generated successfully!');
            $this->info("Certificate: {$certFile}");
            $this->info("Private Key: {$keyFile}");
            $this->warn('Note: This is a self-signed certificate for development only.');
            $this->warn('Your browser will show a security warning - this is normal for local development.');
            $this->info('To serve with HTTPS, use: php artisan serve --host=127.0.0.1 --port=8443 --tls');
            return Command::SUCCESS;
        } else {
            $this->error('Failed to generate SSL certificate.');
            $this->error('Make sure OpenSSL is installed and available in your PATH.');
            if ($output) {
                $this->error('Output: ' . $output);
            }
            return Command::FAILURE;
        }
    }
}

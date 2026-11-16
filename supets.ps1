# Compatible with Windows PowerShell 5.1 and PowerShell 7. No policy changes.
# Keep application arguments as data; all application option handling belongs to Node.
$forwardedArguments = @()
foreach ($argument in $args) { $forwardedArguments += [string]$argument }
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# .NET Framework lacks ProcessStartInfo.ArgumentList. This is Windows argv quoting,
# not a shell command: UseShellExecute is always false and no expression is evaluated.
function ConvertTo-WindowsArgument([string]$Value) {
    if ($Value.Length -gt 0 -and $Value -notmatch '[\s"]') { return $Value }
    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append('"')
    $slashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') {
            $slashes++
        } elseif ($character -eq '"') {
            [void]$builder.Append(('\' * (2 * $slashes + 1)))
            [void]$builder.Append('"')
            $slashes = 0
        } else {
            if ($slashes -gt 0) { [void]$builder.Append(('\' * $slashes)) }
            [void]$builder.Append($character)
            $slashes = 0
        }
    }
    if ($slashes -gt 0) { [void]$builder.Append(('\' * (2 * $slashes))) }
    [void]$builder.Append('"')
    return $builder.ToString()
}

function Invoke-Docker {
    param([string[]]$CommandArgs, [switch]$Capture)
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $script:dockerBin
    $start.UseShellExecute = $false
    $start.WorkingDirectory = $script:root
    if ($null -ne $start.PSObject.Properties['ArgumentList']) {
        foreach ($item in $CommandArgs) { [void]$start.ArgumentList.Add($item) }
    } else {
        $quoted = @()
        foreach ($item in $CommandArgs) { $quoted += ConvertTo-WindowsArgument $item }
        $start.Arguments = $quoted -join ' '
    }
    if ($Capture) {
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        $start.StandardOutputEncoding = [System.Text.Encoding]::UTF8
        $start.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    }
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $start
    try {
        [void]$process.Start()
        if ($Capture) {
            $stdout = $process.StandardOutput.ReadToEndAsync()
            $stderr = $process.StandardError.ReadToEndAsync()
        }
        $process.WaitForExit()
        $result = [pscustomobject]@{ ExitCode = $process.ExitCode; Output = ''; ErrorText = '' }
        if ($Capture) {
            $result.Output = $stdout.GetAwaiter().GetResult().TrimEnd("`r", "`n")
            $result.ErrorText = $stderr.GetAwaiter().GetResult().TrimEnd("`r", "`n")
        }
        return $result
    } finally {
        $process.Dispose()
    }
}

$containerId = ''
$exitCode = 1
try {
    $script:root = [System.IO.Path]::GetFullPath($PSScriptRoot)
    if ($script:root.Contains(',')) { throw 'O caminho do projeto não pode conter vírgula (limitação de --mount do Docker). Mova o checkout e tente novamente.' }
    $script:dockerBin = $env:DOCKER_BIN
    if ([string]::IsNullOrEmpty($script:dockerBin)) { $script:dockerBin = 'docker' }
    $dockerCommand = Get-Command -Name $script:dockerBin -CommandType Application -ErrorAction SilentlyContinue
    if ($null -eq $dockerCommand) { throw 'Docker não encontrado. Instale/inicie o Docker Engine ou Docker Desktop (contêineres Linux), ou defina DOCKER_BIN com o caminho do executável.' }
    $script:dockerBin = @($dockerCommand)[0].Source

    $project = 'supets-local'
    for ($index = 0; $index -lt $forwardedArguments.Count; $index++) {
        if ($forwardedArguments[$index] -ceq '--project') {
            $index++
            if ($index -ge $forwardedArguments.Count) { throw '--project requer um nome.' }
            $project = $forwardedArguments[$index]
        } elseif ($forwardedArguments[$index].StartsWith('--project=', [System.StringComparison]::Ordinal)) {
            throw 'Use --project nome (não --project=nome).'
        }
    }
    if ($project -cnotmatch '^[a-z0-9][a-z0-9_-]*$') { throw 'Projeto inválido: use [a-z0-9][a-z0-9_-]*.' }

    # Context overrides DOCKER_HOST, matching the Docker CLI's endpoint precedence.
    if (-not [string]::IsNullOrEmpty($env:DOCKER_CONTEXT)) {
        $context = Invoke-Docker -CommandArgs @('context', 'inspect', $env:DOCKER_CONTEXT, '--format', '{{.Endpoints.docker.Host}}') -Capture
        if ($context.ExitCode -ne 0) { throw 'Contexto Docker indisponível. Selecione um contexto local válido.' }
        $endpoint = $context.Output
    } elseif (-not [string]::IsNullOrEmpty($env:DOCKER_HOST)) {
        $endpoint = $env:DOCKER_HOST
    } else {
        $context = Invoke-Docker -CommandArgs @('context', 'inspect', '--format', '{{.Endpoints.docker.Host}}') -Capture
        if ($context.ExitCode -ne 0) { throw 'Contexto Docker indisponível. Inicie o Docker e selecione um contexto local.' }
        $endpoint = $context.Output
    }
    $windowsHost = $env:OS -eq 'Windows_NT'
    if ($endpoint.StartsWith('unix:///', [System.StringComparison]::Ordinal)) {
        $socket = $endpoint.Substring(7)
    } elseif ($windowsHost -and $endpoint -match '^npipe:////\./pipe/[^/\\]+$') {
        # This is the local Windows CLI transport, never a Linux bind-mount source.
        $socket = '/var/run/docker.sock'
    } else {
        throw 'Endpoint Docker remoto/não suportado. Execute o launcher no host do engine e selecione um contexto local Unix ou Docker Desktop.'
    }
    if ($socket.Contains(',')) { throw 'O caminho do socket Docker não pode conter vírgula.' }

    $engine = Invoke-Docker -CommandArgs @('info', '--format', '{{.OSType}};{{.Architecture}};{{.OperatingSystem}};{{range .SecurityOptions}}{{.}}|{{end}}') -Capture
    if ($engine.ExitCode -ne 0) { throw 'Docker inacessível. Inicie o Docker Engine/Desktop e conceda ao seu usuário acesso ao engine; use contêineres Linux.' }
    $fields = $engine.Output.Split(';')
    if ($fields.Count -ne 4) { throw 'O Docker retornou metadados de engine inesperados.' }
    if ($fields[0] -cne 'linux') { throw 'O Docker deve estar em modo contêineres Linux; altere o Docker Desktop e tente novamente.' }
    switch -CaseSensitive ($fields[1]) {
        'amd64' { $platform = 'linux/amd64' }
        'x86_64' { $platform = 'linux/amd64' }
        'arm64' { $platform = 'linux/arm64' }
        'aarch64' { $platform = 'linux/arm64' }
        default { throw "Arquitetura Docker não suportada: $($fields[1]) (use amd64 ou arm64)." }
    }
    $rootless = 'false'
    if ($fields[3].Contains('name=rootless')) { $rootless = 'true' }
    if ($fields[3].Contains('name=userns') -and $rootless -ne 'true') { throw 'Docker rootful com userns-remap não é suportado. Use um engine local sem remapeamento ou rootless; nenhuma configuração de segurança foi alterada.' }
    if ($fields[2].Contains('Docker Desktop')) { $socket = '/var/run/docker.sock' }
    if ($windowsHost -and -not $fields[2].Contains('Docker Desktop')) { throw 'No Windows, use o Docker Desktop local em modo contêineres Linux.' }

    $callerUid = ''
    $callerGid = ''
    $hostOs = 'windows'
    if (-not $windowsHost) {
        $hostOs = 'unix'
        $callerUid = [string](& id -u)
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível obter o UID do usuário.' }
        $callerGid = [string](& id -g)
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível obter o GID do usuário.' }
    }

    $build = Invoke-Docker -CommandArgs @('build', '--platform', $platform, '--tag', 'supets-tools:local', '--file', (Join-Path $script:root 'deploy/Dockerfile.tools'), $script:root)
    if ($build.ExitCode -ne 0) { $exitCode = $build.ExitCode } else {
        $stateVolume = "supets-$project-state"
        $labelTemplate = '{{index .Labels "com.supets.managed"}};{{index .Labels "com.supets.project"}}'
        $volume = Invoke-Docker -CommandArgs @('volume', 'inspect', '--format', $labelTemplate, $stateVolume) -Capture
        if ($volume.ExitCode -ne 0) {
            $createdVolume = Invoke-Docker -CommandArgs @('volume', 'create', '--label', 'com.supets.managed=true', '--label', "com.supets.project=$project", $stateVolume) -Capture
            if ($createdVolume.ExitCode -ne 0) { throw 'Não foi possível criar o volume de controle.' }
            $volume = Invoke-Docker -CommandArgs @('volume', 'inspect', '--format', $labelTemplate, $stateVolume) -Capture
        }
        if ($volume.ExitCode -ne 0 -or $volume.Output -cne "true;$project") { throw "O volume $stateVolume não pertence a este projeto; nenhum volume existente foi alterado." }
        $containerName = "supets-tools-$project-$PID-$([guid]::NewGuid().ToString('N'))"
        $createArguments = @(
            'create', '--init', '--name', $containerName,
            '--label', 'com.supets.managed=true', '--label', "com.supets.project=$project",
            '--user', '0:0', '--platform', $platform, '--workdir', '/workspace',
            '--mount', "type=bind,source=$($script:root),target=/workspace",
            '--mount', "type=bind,source=$socket,target=/var/run/docker.sock",
            '--mount', "type=volume,source=$stateVolume,target=/state",
            '--env', 'DOCKER_HOST=unix:///var/run/docker.sock',
            '--env', "SUPETS_CONTAINER_ID=$containerName",
            '--env', "SUPETS_CALLER_UID=$callerUid", '--env', "SUPETS_CALLER_GID=$callerGid",
            '--env', "SUPETS_ROOTLESS=$rootless", '--env', "SUPETS_PLATFORM=$platform",
            '--env', "SUPETS_HOST_OS=$hostOs",
            'supets-tools:local', 'node', 'deploy/supets.mjs'
        ) + $forwardedArguments
        $created = Invoke-Docker -CommandArgs $createArguments -Capture
        if ($created.ExitCode -ne 0) {
            [Console]::Error.WriteLine($created.ErrorText)
            $exitCode = $created.ExitCode
        } else {
            $containerId = $created.Output
            $attached = Invoke-Docker -CommandArgs @('start', '--attach', $containerId)
            $state = Invoke-Docker -CommandArgs @('inspect', '--format', '{{.State.Status}};{{.State.ExitCode}}', $containerId) -Capture
            if ($state.ExitCode -ne 0) { throw 'Não foi possível obter o resultado do contêiner de ferramentas.' }
            $status = $state.Output.Split(';')
            if ($status.Count -eq 2 -and $status[0] -in @('exited', 'dead')) {
                $exitCode = [int]$status[1]
            } elseif ($attached.ExitCode -ne 0) {
                $exitCode = $attached.ExitCode
            } else {
                throw 'A conexão com as ferramentas terminou antes da execução; o contêiner será removido.'
            }
        }
    }
} catch {
    [Console]::Error.WriteLine("SuPets: $($_.Exception.Message)")
    $exitCode = 1
} finally {
    if (-not [string]::IsNullOrEmpty($containerId)) {
        try { $null = Invoke-Docker -CommandArgs @('rm', '--force', $containerId) -Capture } catch { }
    }
}
exit $exitCode

using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;

internal static class SourceLauncher
{
    // Windows command-line quoting, including quotes and trailing backslashes.
    private static string Quote(string value)
    {
        var result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char character in value)
        {
            if (character == '\\')
            {
                slashes++;
                continue;
            }
            result.Append('\\', character == '"' ? slashes * 2 + 1 : slashes);
            result.Append(character);
            slashes = 0;
        }
        result.Append('\\', slashes * 2);
        return result.Append('"').ToString();
    }

    [STAThread]
    private static int Main(string[] args)
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string scripts = Path.Combine(root, ".venv", "Scripts");
        string entry = Path.Combine(root, "sentinel_desktop.py");
        string repair = "Run Sentinel.cmd in this repository to prepare or repair the desktop environment.";
        try
        {
            if (!File.Exists(entry) || !File.Exists(Path.Combine(scripts, "pythonw.exe")) ||
                !File.Exists(Path.Combine(scripts, "python.exe")))
                throw new InvalidOperationException("The source launcher needs its repository and .venv. " + repair);

            var probe = new ProcessStartInfo(Path.Combine(scripts, "python.exe"),
                "-c \"import flask, cv2, numpy, volcenginesdkarkruntime, webview\"")
            {
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var process = Process.Start(probe))
            {
                process.OutputDataReceived += delegate { };
                process.ErrorDataReceived += delegate { };
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                if (!process.WaitForExit(30000))
                {
                    process.Kill();
                    throw new InvalidOperationException("The desktop dependency check timed out. " + repair);
                }
                if (process.ExitCode != 0)
                    throw new InvalidOperationException("Desktop dependencies are missing or could not load. " + repair);
            }
            var launch = new ProcessStartInfo(Path.Combine(scripts, "pythonw.exe"),
                Quote(entry) + " " + string.Join(" ", args.Select(Quote)))
            {
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using (Process.Start(launch)) { }
            return 0;
        }
        catch (Exception error)
        {
            if (!(error is IOException || error is Win32Exception || error is InvalidOperationException))
                throw;
            MessageBox.Show(error.Message, "Sentinel", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}

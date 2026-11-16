import jenkins.model.Jenkins
import hudson.model.Node

// The setup wizard and its security realm/authorization strategy remain authoritative.
// Docker socket access grants host administration: only trusted administrator jobs belong here.
def controller = Jenkins.get()
controller.setNumExecutors(1)
controller.setLabelString('supets-docker')
controller.setMode(Node.Mode.EXCLUSIVE)
controller.setSlaveAgentPort(-1)
controller.save()
